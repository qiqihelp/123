#include <algorithm>
#include <cctype>
#include <chrono>
#include <cstdlib>
#include <ctime>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <map>
#include <set>
#include <sstream>
#include <string>
#include <system_error>
#include <vector>

#if defined(__unix__) || defined(__APPLE__) || defined(__ANDROID__)
#include <unistd.h>
#endif

namespace fs = std::filesystem;

namespace {

// ==================== ANSI 终端颜色 ====================
bool g_useColor = true;
bool g_dryRun = false;

std::string clr(const std::string& code) {
    return g_useColor ? code : "";
}

const std::string C_RESET  = "\033[0m";
const std::string C_BOLD   = "\033[1m";
const std::string C_DIM    = "\033[2m";
const std::string C_RED    = "\033[31m";
const std::string C_GREEN  = "\033[32m";
const std::string C_YELLOW = "\033[33m";
const std::string C_BLUE   = "\033[34m";
const std::string C_CYAN   = "\033[36m";

// ==================== 数据结构 ====================
struct FileRecord {
    fs::path path;
    std::string ext;      // 小写扩展名，无扩展名为 "(无后缀)"
    std::uintmax_t size;  // 字节数
    std::string mtimeStr; // 修改时间字符串
    bool isDir = false;
};

struct TrashEntry {
    std::string id;
    std::string timestamp;
    fs::path originalPath;
    fs::path trashPath;
    std::uintmax_t size = 0;
};

struct AppConfig {
    bool permissionGranted = false;
    bool storageAccessible = false;
    bool isTermux = false;
    bool hasRoot = false;
    fs::path homeDir;
    fs::path sharedStorageDir;
    fs::path sdcardDir;
    fs::path dataDir;      // ~/.termux_cleaner
    fs::path trashDir;     // ~/.termux_cleaner/trash
    fs::path manifestFile; // ~/.termux_cleaner/trash_manifest.tsv
    fs::path logFile;      // ~/.termux_cleaner/cleaner.log
    std::vector<std::string> excludedFolderNames = {
        ".git", ".termux_cleaner", "Android/data", "Android/obb"
    };
};

// ==================== 工具函数 ====================
std::string toLower(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });
    return s;
}

std::string trim(const std::string& s) {
    size_t start = 0;
    while (start < s.size() && std::isspace(static_cast<unsigned char>(s[start]))) {
        ++start;
    }
    size_t end = s.size();
    while (end > start && std::isspace(static_cast<unsigned char>(s[end - 1]))) {
        --end;
    }
    return s.substr(start, end - start);
}

std::string formatSize(std::uintmax_t bytes) {
    const char* units[] = {"B", "KB", "MB", "GB", "TB"};
    double val = static_cast<double>(bytes);
    int idx = 0;
    while (val >= 1024.0 && idx < 4) {
        val /= 1024.0;
        ++idx;
    }
    std::ostringstream oss;
    if (idx == 0) {
        oss << bytes << " B";
    } else {
        oss << std::fixed << std::setprecision(2) << val << " " << units[idx];
    }
    return oss.str();
}

std::string currentTimeStr(const char* fmt = "%Y-%m-%d %H:%M:%S") {
    auto now = std::chrono::system_clock::now();
    std::time_t t = std::chrono::system_clock::to_time_t(now);
    std::tm tmBuf{};
#if defined(_WIN32)
    localtime_s(&tmBuf, &t);
#else
    localtime_r(&t, &tmBuf);
#endif
    char buf[64];
    std::strftime(buf, sizeof(buf), fmt, &tmBuf);
    return std::string(buf);
}

std::string formatFileTime(const fs::file_time_type& ftime) {
    // C++17 portable conversion to system_clock
    auto sctp = std::chrono::time_point_cast<std::chrono::system_clock::duration>(
        ftime - fs::file_time_type::clock::now() + std::chrono::system_clock::now());
    std::time_t tt = std::chrono::system_clock::to_time_t(sctp);
    std::tm tmBuf{};
#if defined(_WIN32)
    localtime_s(&tmBuf, &tt);
#else
    localtime_r(&tt, &tmBuf);
#endif
    char buf[32];
    std::strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M", &tmBuf);
    return std::string(buf);
}

std::string readLine(const std::string& prompt) {
    std::cout << prompt << std::flush;
    std::string line;
    if (!std::getline(std::cin, line)) {
        std::cout << "\n";
        std::exit(0);
    }
    return trim(line);
}

void pausePrompt() {
    readLine("\n" + clr(C_DIM) + "按 Enter 键继续..." + clr(C_RESET));
}

bool pathAccessRW(const fs::path& p) {
    std::error_code ec;
    if (!fs::exists(p, ec) || !fs::is_directory(p, ec)) {
        return false;
    }
#if defined(__unix__) || defined(__APPLE__) || defined(__ANDROID__)
    if (::access(p.c_str(), R_OK | W_OK | X_OK) != 0) {
        return false;
    }
#endif
    // 尝试迭代确认系统真实放行读取
    fs::directory_iterator it(p, fs::directory_options::skip_permission_denied, ec);
    if (ec) {
        return false;
    }
    return true;
}

bool commandExists(const std::string& cmd) {
    std::string check = "command -v " + cmd + " >/dev/null 2>&1";
    return std::system(check.c_str()) == 0;
}

void writeLog(const AppConfig& cfg, const std::string& msg) {
    std::error_code ec;
    fs::create_directories(cfg.dataDir, ec);
    std::ofstream ofs(cfg.logFile, std::ios::app);
    if (ofs) {
        ofs << "[" << currentTimeStr() << "] " << msg << "\n";
    }
}

std::string normalizeExt(std::string ext) {
    ext = toLower(trim(ext));
    if (ext.empty()) return "";
    if (ext == "*" || ext == ".*") return "*";
    if (ext[0] != '.') {
        ext = "." + ext;
    }
    return ext;
}

std::vector<std::string> parseExtensions(const std::string& input) {
    std::vector<std::string> exts;
    std::set<std::string> seen;
    std::string normalized = input;
    for (char& ch : normalized) {
        if (ch == ',' || ch == ';' || ch == '|' || ch == '\t') {
            ch = ' ';
        }
    }
    std::istringstream iss(normalized);
    std::string token;
    while (iss >> token) {
        std::string ext = normalizeExt(token);
        if (!ext.empty() && seen.insert(ext).second) {
            exts.push_back(ext);
        }
    }
    return exts;
}

bool isProtectedRootPath(const fs::path& target, const AppConfig& cfg) {
    std::error_code ec;
    fs::path canon = fs::weakly_canonical(target, ec);
    if (ec) canon = target.lexically_normal();
    std::string s = canon.string();
    while (s.size() > 1 && s.back() == '/') s.pop_back();

    static const std::vector<std::string> forbidden = {
        "/", "/bin", "/boot", "/dev", "/etc", "/lib", "/lib64",
        "/proc", "/root", "/sbin", "/sys", "/system", "/usr",
        "/var", "/vendor", "/apex", "/product", "/odm"
    };
    for (const auto& f : forbidden) {
        if (s == f) return true;
    }

    const char* prefix = std::getenv("PREFIX");
    if (prefix && *prefix) {
        std::string pStr(prefix);
        while (pStr.size() > 1 && pStr.back() == '/') pStr.pop_back();
        if (s == pStr || s == pStr + "/bin" || s == pStr + "/lib") {
            return true;
        }
    }

    if (!cfg.dataDir.empty()) {
        fs::path dataCanon = fs::weakly_canonical(cfg.dataDir, ec);
        if (!ec && s == dataCanon.string()) return true;
    }
    return false;
}

bool shouldExcludePath(const fs::path& p, const AppConfig& cfg, bool protectMedia) {
    std::string pStr = p.generic_string();
    for (const auto& ex : cfg.excludedFolderNames) {
        if (ex.empty()) continue;
        // 匹配路径片段
        if (pStr.find("/" + ex) != std::string::npos ||
            p.filename().string() == ex) {
            return true;
        }
    }
    if (protectMedia) {
        if (pStr.find("/DCIM") != std::string::npos ||
            pStr.find("/Pictures") != std::string::npos) {
            return true;
        }
    }
    return false;
}

// ==================== 权限初始化与授权流程 ====================
void detectEnvironment(AppConfig& cfg) {
    const char* home = std::getenv("HOME");
    cfg.homeDir = (home && *home) ? fs::path(home) : fs::current_path();

    const char* tv = std::getenv("TERMUX_VERSION");
    const char* prefix = std::getenv("PREFIX");
    cfg.isTermux = (tv != nullptr) ||
                   (prefix != nullptr && std::string(prefix).find("com.termux") != std::string::npos);

    cfg.sharedStorageDir = cfg.homeDir / "storage" / "shared";
    cfg.sdcardDir = fs::path("/sdcard");
    cfg.dataDir = cfg.homeDir / ".termux_cleaner";
    cfg.trashDir = cfg.dataDir / "trash";
    cfg.manifestFile = cfg.dataDir / "trash_manifest.tsv";
    cfg.logFile = cfg.dataDir / "cleaner.log";

#if defined(__unix__) || defined(__APPLE__) || defined(__ANDROID__)
    cfg.hasRoot = (::geteuid() == 0);
#endif

    cfg.storageAccessible = pathAccessRW(cfg.sharedStorageDir) ||
                            pathAccessRW(cfg.sdcardDir) ||
                            pathAccessRW(fs::path("/storage/emulated/0"));
}

void printBanner() {
    std::cout << "\n"
              << clr(C_CYAN + C_BOLD)
              << "========================================================\n"
              << "       Termux 智能文件清理工具 (C++17 安全增强版)       \n"
              << "========================================================\n"
              << clr(C_RESET);
    if (g_dryRun) {
        std::cout << clr(C_YELLOW + C_BOLD)
                  << "  [!] 当前处于 模拟演练模式 (Dry-Run)：不会实际删除文件\n"
                  << clr(C_RESET);
    }
}

bool runPermissionWizard(AppConfig& cfg) {
    while (true) {
        detectEnvironment(cfg);
        printBanner();

        bool homeOK = pathAccessRW(cfg.homeDir);
        bool sharedOK = pathAccessRW(cfg.sharedStorageDir);
        bool sdcardOK = pathAccessRW(cfg.sdcardDir);
        bool cwdOK = pathAccessRW(fs::current_path());

        std::cout << clr(C_BOLD) << "\n[第 1 步] 权限检查与授权确认\n" << clr(C_RESET);
        std::cout << "在搜索和清理文件之前，需要确认并授予必要的文件系统访问权限：\n\n";

        std::cout << "  • 运行环境       : "
                  << (cfg.isTermux ? clr(C_GREEN) + "Termux (Android)" : clr(C_YELLOW) + "标准 POSIX/Linux 终端")
                  << clr(C_RESET) << "\n";
        std::cout << "  • 当前权限身份   : "
                  << (cfg.hasRoot ? clr(C_YELLOW) + "Root (UID 0)" : clr(C_GREEN) + "普通用户")
                  << clr(C_RESET) << "\n";
        std::cout << "  • 主目录读写     : "
                  << (homeOK ? clr(C_GREEN) + "[已授权] " : clr(C_RED) + "[无权限] ")
                  << cfg.homeDir.string() << clr(C_RESET) << "\n";
        std::cout << "  • Termux共享存储 : "
                  << (sharedOK ? clr(C_GREEN) + "[已授权] " : clr(C_RED) + "[未授权/未链接] ")
                  << cfg.sharedStorageDir.string() << clr(C_RESET) << "\n";
        std::cout << "  • /sdcard 存储   : "
                  << (sdcardOK ? clr(C_GREEN) + "[已授权] " : clr(C_RED) + "[未授权/不可用] ")
                  << cfg.sdcardDir.string() << clr(C_RESET) << "\n";
        std::cout << "  • 当前工作目录   : "
                  << (cwdOK ? clr(C_GREEN) + "[可读写] " : clr(C_RED) + "[无权限] ")
                  << fs::current_path().string() << clr(C_RESET) << "\n\n";

        if (!cfg.storageAccessible && cfg.isTermux) {
            std::cout << clr(C_YELLOW)
                      << "提示：检测到 Termux 尚未获得手机内部存储访问权限。\n"
                      << "请选择 [1] 自动执行 termux-setup-storage 并在系统弹窗中点击“允许”。\n"
                      << clr(C_RESET) << "\n";
        }

        std::cout << "请选择操作：\n";
        std::cout << "  [1] 申请 / 授予 Termux 存储权限 (执行 termux-setup-storage)\n";
        std::cout << "  [2] 我已授予权限，立即进入清理工具 (确认授权扫描与删除操作)\n";
        std::cout << "  [3] 刷新权限检测状态\n";
        std::cout << "  [4] 查看 Termux 权限授予帮助说明\n";
        std::cout << "  [0] 拒绝授权并退出\n";

        std::string choice = readLine("\n请输入选项 [0-4]: ");
        if (choice == "0") {
            std::cout << clr(C_YELLOW) << "未授予权限，程序已安全退出。\n" << clr(C_RESET);
            return false;
        } else if (choice == "1") {
            if (commandExists("termux-setup-storage")) {
                std::cout << clr(C_CYAN) << "\n正在调用 termux-setup-storage ...\n"
                          << "请在弹出的 Android 系统权限框中点击【允许】。\n" << clr(C_RESET);
                int rc = std::system("termux-setup-storage");
                if (rc != 0) {
                    std::cout << clr(C_RED) << "termux-setup-storage 返回错误码: " << rc << clr(C_RESET) << "\n";
                }
                readLine("完成系统弹窗授权后，请按 Enter 键重新检测权限...");
            } else {
                std::cout << clr(C_YELLOW)
                          << "\n未检测到 termux-setup-storage 命令（当前可能不是 Termux 环境）。\n"
                          << "如果你在 Linux 环境运行，可通过 chmod 755 或在当前目录测试授权。\n"
                          << clr(C_RESET);
                pausePrompt();
            }
        } else if (choice == "2") {
            if (cfg.isTermux && !cfg.storageAccessible) {
                std::string ans = readLine(
                    clr(C_YELLOW) +
                    "警告：~/storage/shared 和 /sdcard 当前仍不可读写，你将只能清理 Termux 主目录/当前目录。\n"
                    "确定仍要继续吗？(y/N): " + clr(C_RESET));
                if (toLower(ans) != "y" && toLower(ans) != "yes") {
                    continue;
                }
            } else if (!homeOK && !cwdOK && !cfg.storageAccessible) {
                std::cout << clr(C_RED) << "错误：当前没有任何可读写目录，无法继续。\n" << clr(C_RESET);
                pausePrompt();
                continue;
            }

            std::string ack = readLine(
                clr(C_BOLD) +
                "\n授权确认：允许本工具在您指定的目录中搜索文件并在您确认后执行删除/移动？(输入 y 确认): " +
                clr(C_RESET));
            if (toLower(ack) == "y" || toLower(ack) == "yes") {
                cfg.permissionGranted = true;
                std::error_code ec;
                fs::create_directories(cfg.trashDir, ec);
                writeLog(cfg, "用户已授予权限并进入主菜单。");
                std::cout << clr(C_GREEN) << "\n[✓] 权限已确认，正在进入主菜单...\n" << clr(C_RESET);
                return true;
            }
        } else if (choice == "3") {
            continue;
        } else if (choice == "4") {
            std::cout << "\n" << clr(C_CYAN) << "--- Termux 权限说明 ---\n" << clr(C_RESET)
                      << "1. 存储权限：Termux 默认只能访问自身沙盒目录，运行 `termux-setup-storage` 后\n"
                      << "   会请求 Android 外部存储权限，并在 ~/storage/shared 建立软链接指向内部存储。\n"
                      << "2. Android 11+ 受限目录：Android/data 与 Android/obb 受系统保护，普通权限无法直接访问。\n"
                      << "3. 脚本可执行权限：若编译或通过脚本启动，请运行 `chmod +x cleaner run.sh`。\n"
                      << "4. Root 权限（可选）：仅当你需要清理系统级目录时才需 `tsu` 或 `su`。\n";
            pausePrompt();
        } else {
            std::cout << clr(C_RED) << "无效选项，请重新输入。\n" << clr(C_RESET);
        }
    }
}

// ==================== 回收站管理 ====================
bool moveToTrash(const AppConfig& cfg, const fs::path& src, std::uintmax_t size, std::string& errMsg) {
    std::error_code ec;
    fs::create_directories(cfg.trashDir, ec);
    if (ec) {
        errMsg = "无法创建回收站目录: " + ec.message();
        return false;
    }

    std::string stamp = currentTimeStr("%Y%m%d_%H%M%S");
    static unsigned long long seq = 0;
    ++seq;
    std::string id = stamp + "_" + std::to_string(seq);
    fs::path dest = cfg.trashDir / (id + "_" + src.filename().string());

    if (fs::is_directory(src, ec)) {
        // 空目录直接记录并删除，或建空占位目录
        fs::remove(src, ec);
        if (ec) {
            errMsg = ec.message();
            return false;
        }
        return true;
    }

    fs::rename(src, dest, ec);
    if (ec) {
        // 跨挂载点（例如 /sdcard -> $HOME）降级为 复制 + 删除
        ec.clear();
        fs::copy_file(src, dest, fs::copy_options::overwrite_existing, ec);
        if (ec) {
            errMsg = "移动至回收站失败: " + ec.message();
            return false;
        }
        fs::remove(src, ec);
        if (ec) {
            // 删除源文件失败，回滚回收站副本
            std::error_code ec2;
            fs::remove(dest, ec2);
            errMsg = "无法删除原文件: " + ec.message();
            return false;
        }
    }

    std::ofstream ofs(cfg.manifestFile, std::ios::app);
    if (ofs) {
        ofs << id << "\t" << currentTimeStr() << "\t" << size << "\t"
            << src.string() << "\t" << dest.string() << "\n";
    }
    return true;
}

std::vector<TrashEntry> loadTrashManifest(const AppConfig& cfg) {
    std::vector<TrashEntry> entries;
    std::ifstream ifs(cfg.manifestFile);
    std::string line;
    while (std::getline(ifs, line)) {
        if (line.empty()) continue;
        std::istringstream iss(line);
        TrashEntry e;
        std::string sizeStr, origStr, trashStr;
        if (std::getline(iss, e.id, '\t') &&
            std::getline(iss, e.timestamp, '\t') &&
            std::getline(iss, sizeStr, '\t') &&
            std::getline(iss, origStr, '\t') &&
            std::getline(iss, trashStr)) {
            try {
                e.size = std::stoull(sizeStr);
            } catch (...) {
                e.size = 0;
            }
            e.originalPath = origStr;
            e.trashPath = trashStr;
            std::error_code ec;
            if (fs::exists(e.trashPath, ec)) {
                entries.push_back(std::move(e));
            }
        }
    }
    return entries;
}

void saveTrashManifest(const AppConfig& cfg, const std::vector<TrashEntry>& entries) {
    std::ofstream ofs(cfg.manifestFile, std::ios::trunc);
    for (const auto& e : entries) {
        ofs << e.id << "\t" << e.timestamp << "\t" << e.size << "\t"
            << e.originalPath.string() << "\t" << e.trashPath.string() << "\n";
    }
}

void manageTrashMenu(const AppConfig& cfg) {
    while (true) {
        auto entries = loadTrashManifest(cfg);
        std::uintmax_t total = 0;
        for (const auto& e : entries) total += e.size;

        std::cout << "\n" << clr(C_CYAN + C_BOLD) << "=== 安全回收站管理 ===" << clr(C_RESET) << "\n";
        std::cout << "回收站路径: " << cfg.trashDir.string() << "\n";
        std::cout << "当前项目数: " << entries.size() << "，占用空间: " << formatSize(total) << "\n\n";

        if (entries.empty()) {
            std::cout << clr(C_DIM) << "（回收站为空）\n" << clr(C_RESET);
            pausePrompt();
            return;
        }

        for (size_t i = 0; i < entries.size(); ++i) {
            std::cout << "  [" << (i + 1) << "] " << std::left << std::setw(10) << formatSize(entries[i].size)
                      << " | " << entries[i].timestamp << " | 原路径: " << entries[i].originalPath.string() << "\n";
        }

        std::cout << "\n操作选项：\n"
                  << "  [1] 还原指定编号文件\n"
                  << "  [2] 彻底清空回收站\n"
                  << "  [0] 返回主菜单\n";
        std::string ch = readLine("请选择: ");
        if (ch == "0") return;
        if (ch == "1") {
            std::string idxStr = readLine("输入要还原的编号: ");
            try {
                size_t idx = std::stoull(idxStr);
                if (idx >= 1 && idx <= entries.size()) {
                    const auto& e = entries[idx - 1];
                    if (g_dryRun) {
                        std::cout << clr(C_YELLOW) << "[Dry-Run] 将还原: " << e.originalPath.string() << clr(C_RESET) << "\n";
                    } else {
                        std::error_code ec;
                        fs::create_directories(e.originalPath.parent_path(), ec);
                        fs::rename(e.trashPath, e.originalPath, ec);
                        if (ec) {
                            ec.clear();
                            fs::copy_file(e.trashPath, e.originalPath, fs::copy_options::overwrite_existing, ec);
                            if (!ec) fs::remove(e.trashPath, ec);
                        }
                        if (ec) {
                            std::cout << clr(C_RED) << "还原失败: " << ec.message() << clr(C_RESET) << "\n";
                        } else {
                            std::cout << clr(C_GREEN) << "[✓] 已还原至: " << e.originalPath.string() << clr(C_RESET) << "\n";
                            writeLog(cfg, "从回收站还原: " + e.originalPath.string());
                            entries.erase(entries.begin() + static_cast<std::ptrdiff_t>(idx - 1));
                            saveTrashManifest(cfg, entries);
                        }
                    }
                } else {
                    std::cout << clr(C_RED) << "编号超出范围。\n" << clr(C_RESET);
                }
            } catch (...) {
                std::cout << clr(C_RED) << "无效编号。\n" << clr(C_RESET);
            }
        } else if (ch == "2") {
            std::string conf = readLine(clr(C_RED) + "确认彻底清空回收站？此操作不可恢复 (输入 YES 确认): " + clr(C_RESET));
            if (conf == "YES") {
                if (g_dryRun) {
                    std::cout << clr(C_YELLOW) << "[Dry-Run] 模拟清空回收站。\n" << clr(C_RESET);
                } else {
                    std::error_code ec;
                    for (const auto& e : entries) {
                        fs::remove(e.trashPath, ec);
                    }
                    saveTrashManifest(cfg, {});
                    writeLog(cfg, "清空回收站，释放 " + formatSize(total));
                    std::cout << clr(C_GREEN) << "[✓] 回收站已清空，释放 " << formatSize(total) << clr(C_RESET) << "\n";
                }
            }
        }
    }
}

// ==================== 搜索目标路径选择 ====================
fs::path chooseTargetDirectory(const AppConfig& cfg) {
    std::vector<std::pair<std::string, fs::path>> candidates;
    if (pathAccessRW(cfg.sharedStorageDir)) {
        candidates.push_back({"Termux 共享存储根目录", cfg.sharedStorageDir});
        if (fs::exists(cfg.sharedStorageDir / "Download")) {
            candidates.push_back({"手机下载目录 (Download)", cfg.sharedStorageDir / "Download"});
        }
        if (fs::exists(cfg.sharedStorageDir / "Documents")) {
            candidates.push_back({"手机文档目录 (Documents)", cfg.sharedStorageDir / "Documents"});
        }
    } else if (pathAccessRW(cfg.sdcardDir)) {
        candidates.push_back({"/sdcard 根目录", cfg.sdcardDir});
        if (fs::exists(cfg.sdcardDir / "Download")) {
            candidates.push_back({"/sdcard/Download", cfg.sdcardDir / "Download"});
        }
    }
    candidates.push_back({"Termux 主目录 ($HOME)", cfg.homeDir});
    candidates.push_back({"当前工作目录 (.)", fs::current_path()});

    std::cout << "\n请选择要搜索的目标目录：\n";
    for (size_t i = 0; i < candidates.size(); ++i) {
        std::cout << "  [" << (i + 1) << "] " << candidates[i].first
                  << clr(C_DIM) << " (" << candidates[i].second.string() << ")" << clr(C_RESET) << "\n";
    }
    std::cout << "  [C] 手动输入自定义路径\n";
    std::cout << "  [0] 取消返回\n";

    while (true) {
        std::string ch = readLine("选择目录: ");
        if (ch == "0") return {};
        if (toLower(ch) == "c") {
            std::string pStr = readLine("请输入完整目录路径: ");
            if (pStr.empty()) continue;
            if (pStr[0] == '~') {
                pStr = cfg.homeDir.string() + pStr.substr(1);
            }
            fs::path custom(pStr);
            std::error_code ec;
            if (!fs::exists(custom, ec) || !fs::is_directory(custom, ec)) {
                std::cout << clr(C_RED) << "目录不存在或不是有效文件夹。\n" << clr(C_RESET);
                continue;
            }
            if (isProtectedRootPath(custom, cfg)) {
                std::cout << clr(C_RED) << "安全拦截：禁止对系统关键目录执行清理扫描！\n" << clr(C_RESET);
                continue;
            }
            return custom;
        }
        try {
            size_t idx = std::stoull(ch);
            if (idx >= 1 && idx <= candidates.size()) {
                fs::path selected = candidates[idx - 1].second;
                if (isProtectedRootPath(selected, cfg)) {
                    std::cout << clr(C_RED) << "安全拦截：禁止扫描受保护路径。\n" << clr(C_RESET);
                    continue;
                }
                return selected;
            }
        } catch (...) {}
        std::cout << clr(C_RED) << "无效选择，请重试。\n" << clr(C_RESET);
    }
}

// ==================== 搜索完展示 & 询问是否删除 ====================
std::vector<size_t> parseSelectionIndices(const std::string& input, size_t maxCount) {
    std::set<size_t> picked;
    std::string s = input;
    for (char& c : s) {
        if (c == ',' || c == ';') c = ' ';
    }
    std::istringstream iss(s);
    std::string tok;
    while (iss >> tok) {
        auto dash = tok.find('-');
        if (dash != std::string::npos) {
            try {
                size_t a = std::stoull(tok.substr(0, dash));
                size_t b = std::stoull(tok.substr(dash + 1));
                if (a > b) std::swap(a, b);
                for (size_t k = a; k <= b; ++k) {
                    if (k >= 1 && k <= maxCount) picked.insert(k - 1);
                }
            } catch (...) {}
        } else {
            try {
                size_t k = std::stoull(tok);
                if (k >= 1 && k <= maxCount) picked.insert(k - 1);
            } catch (...) {}
        }
    }
    return std::vector<size_t>(picked.begin(), picked.end());
}

void displayResultsPage(const std::vector<FileRecord>& results, size_t limit) {
    size_t count = std::min(results.size(), limit);
    for (size_t i = 0; i < count; ++i) {
        const auto& r = results[i];
        std::cout << "  " << clr(C_CYAN) << "[" << std::setw(3) << (i + 1) << "]" << clr(C_RESET)
                  << " " << std::left << std::setw(10) << (r.isDir ? "<空目录>" : formatSize(r.size))
                  << " | " << std::setw(16) << r.mtimeStr
                  << " | " << r.path.string() << "\n";
    }
    if (results.size() > limit) {
        std::cout << clr(C_DIM) << "  ... 还有 " << (results.size() - limit)
                  << " 个结果未展开（选择 [L] 可查看完整列表）\n" << clr(C_RESET);
    }
}

void executeDeletion(const AppConfig& cfg,
                     const std::vector<FileRecord>& results,
                     const std::vector<size_t>& indices,
                     bool useTrash) {
    if (indices.empty()) {
        std::cout << clr(C_YELLOW) << "未选中任何文件，取消删除。\n" << clr(C_RESET);
        return;
    }

    std::uintmax_t targetBytes = 0;
    for (size_t idx : indices) targetBytes += results[idx].size;

    std::cout << "\n即将" << (useTrash ? "移入安全回收站" : "永久删除")
              << " " << clr(C_BOLD) << indices.size() << clr(C_RESET)
              << " 个项目，总计 " << clr(C_YELLOW) << formatSize(targetBytes) << clr(C_RESET) << "。\n";

    std::string confirm;
    if (useTrash) {
        confirm = readLine("确认移入安全回收站吗？(y/N): ");
        if (toLower(confirm) != "y" && toLower(confirm) != "yes") {
            std::cout << clr(C_YELLOW) << "已取消删除操作。\n" << clr(C_RESET);
            return;
        }
    } else {
        confirm = readLine(clr(C_RED + C_BOLD) + "警告：永久删除不可恢复！请输入 YES 确认删除: " + clr(C_RESET));
        if (confirm != "YES") {
            std::cout << clr(C_YELLOW) << "未输入 YES，已取消删除操作。\n" << clr(C_RESET);
            return;
        }
    }

    size_t okCount = 0;
    size_t failCount = 0;
    std::uintmax_t freedBytes = 0;

    for (size_t idx : indices) {
        const auto& r = results[idx];
        if (g_dryRun) {
            std::cout << clr(C_YELLOW) << "  [Dry-Run] 模拟删除: " << r.path.string() << clr(C_RESET) << "\n";
            ++okCount;
            freedBytes += r.size;
            continue;
        }

        std::error_code ec;
        if (useTrash) {
            std::string errMsg;
            if (moveToTrash(cfg, r.path, r.size, errMsg)) {
                ++okCount;
                freedBytes += r.size;
            } else {
                ++failCount;
                std::cout << clr(C_RED) << "  [失败] " << r.path.string() << " -> " << errMsg << clr(C_RESET) << "\n";
            }
        } else {
            bool removed = fs::remove(r.path, ec);
            if (removed && !ec) {
                ++okCount;
                freedBytes += r.size;
            } else {
                ++failCount;
                std::cout << clr(C_RED) << "  [失败] " << r.path.string()
                          << " -> " << (ec ? ec.message() : "删除失败") << clr(C_RESET) << "\n";
            }
        }
    }

    std::cout << "\n" << clr(C_GREEN + C_BOLD)
              << "清理完成！成功处理 " << okCount << " 项";
    if (failCount > 0) {
        std::cout << "，失败 " << failCount << " 项";
    }
    std::cout << "，累计释放空间 " << formatSize(freedBytes) << "。" << clr(C_RESET) << "\n";

    if (!g_dryRun) {
        writeLog(cfg, std::string(useTrash ? "移入回收站 " : "永久删除 ") +
                          std::to_string(okCount) + " 项，释放 " + formatSize(freedBytes));
    }
}

void reviewAndAskToDelete(const AppConfig& cfg,
                          const std::vector<FileRecord>& results,
                          const std::string& title) {
    std::cout << "\n" << clr(C_CYAN + C_BOLD) << "=== 搜索完成：" << title << " ===" << clr(C_RESET) << "\n";
    if (results.empty()) {
        std::cout << clr(C_GREEN) << "未发现符合条件的文件或目录，当前无需清理。\n" << clr(C_RESET);
        pausePrompt();
        return;
    }

    std::uintmax_t totalBytes = 0;
    std::map<std::string, std::pair<size_t, std::uintmax_t>> statsByExt;
    for (const auto& r : results) {
        totalBytes += r.size;
        auto& st = statsByExt[r.ext];
        st.first += 1;
        st.second += r.size;
    }

    std::cout << "共搜索到 " << clr(C_BOLD) << results.size() << clr(C_RESET)
              << " 个匹配项，总大小: " << clr(C_YELLOW + C_BOLD) << formatSize(totalBytes) << clr(C_RESET) << "\n\n";

    std::cout << clr(C_BOLD) << "按类型统计：\n" << clr(C_RESET);
    for (const auto& kv : statsByExt) {
        std::cout << "  • " << std::left << std::setw(14) << kv.first
                  << ": " << std::setw(5) << kv.second.first << " 项 ("
                  << formatSize(kv.second.second) << ")\n";
    }

    std::cout << "\n" << clr(C_BOLD) << "文件列表预览：\n" << clr(C_RESET);
    displayResultsPage(results, 30);

    while (true) {
        std::cout << "\n" << clr(C_BOLD) << "搜索完毕，是否删除这些文件？" << clr(C_RESET) << "\n"
                  << "  [1] 全部移入安全回收站 (推荐，可恢复)\n"
                  << "  [2] 全部永久删除 (彻底清除，需输入 YES)\n"
                  << "  [3] 按编号选择要删除的文件 (如: 1 3 5-8)\n"
                  << "  [4] 按指定后缀筛选删除 (如只删 .tmp)\n"
                  << "  [L] 查看全部 " << results.size() << " 条文件列表\n"
                  << "  [E] 导出扫描结果到报告文件\n"
                  << "  [0] 不删除，返回主菜单\n";

        std::string ch = readLine("请选择处理方式: ");
        std::string lowerCh = toLower(ch);
        if (lowerCh == "0") {
            std::cout << clr(C_DIM) << "已保留所有文件，未执行删除。\n" << clr(C_RESET);
            return;
        } else if (lowerCh == "l") {
            std::cout << "\n";
            displayResultsPage(results, results.size());
        } else if (lowerCh == "e") {
            std::error_code ec;
            fs::create_directories(cfg.dataDir, ec);
            fs::path reportPath = cfg.dataDir / ("scan_report_" + currentTimeStr("%Y%m%d_%H%M%S") + ".txt");
            std::ofstream ofs(reportPath);
            if (ofs) {
                ofs << "扫描报告: " << title << "\n时间: " << currentTimeStr() << "\n"
                    << "总数量: " << results.size() << " 总大小: " << formatSize(totalBytes) << "\n\n";
                for (size_t i = 0; i < results.size(); ++i) {
                    ofs << "[" << (i + 1) << "] " << formatSize(results[i].size)
                        << " | " << results[i].mtimeStr << " | " << results[i].path.string() << "\n";
                }
                std::cout << clr(C_GREEN) << "[✓] 报告已导出至: " << reportPath.string() << clr(C_RESET) << "\n";
            } else {
                std::cout << clr(C_RED) << "导出报告失败。\n" << clr(C_RESET);
            }
        } else if (lowerCh == "1" || lowerCh == "2") {
            std::vector<size_t> allIdx(results.size());
            for (size_t i = 0; i < results.size(); ++i) allIdx[i] = i;
            executeDeletion(cfg, results, allIdx, lowerCh == "1");
            pausePrompt();
            return;
        } else if (lowerCh == "3") {
            std::string idxInput = readLine("请输入要删除的编号 (支持空格/逗号/区间如 1 2 4-6): ");
            auto picked = parseSelectionIndices(idxInput, results.size());
            if (picked.empty()) {
                std::cout << clr(C_RED) << "未识别到有效编号。\n" << clr(C_RESET);
                continue;
            }
            std::string mode = readLine("删除方式：[1] 移入回收站  [2] 永久删除 (默认 1): ");
            executeDeletion(cfg, results, picked, mode != "2");
            pausePrompt();
            return;
        } else if (lowerCh == "4") {
            std::string extInput = readLine("请输入要删除的后缀 (例如 .tmp .log): ");
            auto targetExts = parseExtensions(extInput);
            if (targetExts.empty()) {
                std::cout << clr(C_RED) << "未输入有效后缀。\n" << clr(C_RESET);
                continue;
            }
            std::set<std::string> extSet(targetExts.begin(), targetExts.end());
            std::vector<size_t> picked;
            for (size_t i = 0; i < results.size(); ++i) {
                if (extSet.count(results[i].ext)) {
                    picked.push_back(i);
                }
            }
            if (picked.empty()) {
                std::cout << clr(C_YELLOW) << "结果中没有匹配该后缀的文件。\n" << clr(C_RESET);
                continue;
            }
            std::string mode = readLine("匹配到 " + std::to_string(picked.size()) +
                                        " 项。删除方式：[1] 移入回收站  [2] 永久删除 (默认 1): ");
            executeDeletion(cfg, results, picked, mode != "2");
            pausePrompt();
            return;
        } else {
            std::cout << clr(C_RED) << "无效选项，请重新输入。\n" << clr(C_RESET);
        }
    }
}

// ==================== 扫描引擎 ====================
std::vector<FileRecord> scanFilesByExtensions(const AppConfig& cfg,
                                              const fs::path& rootDir,
                                              const std::vector<std::string>& extensions,
                                              std::uintmax_t minBytes,
                                              int maxDepth,
                                              bool protectMedia) {
    std::set<std::string> extSet(extensions.begin(), extensions.end());
    bool matchAll = extSet.count("*") > 0;

    std::vector<FileRecord> matches;
    std::error_code ec;
    size_t scannedCount = 0;

    std::cout << clr(C_CYAN) << "\n正在扫描目录: " << rootDir.string() << " ...\n" << clr(C_RESET);

    fs::recursive_directory_iterator it(
        rootDir,
        fs::directory_options::skip_permission_denied,
        ec);
    fs::recursive_directory_iterator end;

    for (; it != end; it.increment(ec)) {
        if (ec) {
            ec.clear();
            continue;
        }
        const fs::directory_entry& entry = *it;

        if (entry.is_symlink(ec)) {
            if (entry.is_directory(ec)) {
                it.disable_recursion_pending();
            }
            continue;
        }

        if (entry.is_directory(ec)) {
            if (shouldExcludePath(entry.path(), cfg, protectMedia) ||
                (maxDepth >= 0 && it.depth() >= maxDepth)) {
                it.disable_recursion_pending();
            }
            continue;
        }

        if (!entry.is_regular_file(ec)) continue;
        ++scannedCount;
        if (scannedCount % 500 == 0) {
            std::cout << "\r  已扫描 " << scannedCount << " 个文件，命中 " << matches.size() << " 项..." << std::flush;
        }

        std::string fileExt = toLower(entry.path().extension().string());
        std::string fileNameLower = toLower(entry.path().filename().string());

        bool hit = matchAll;
        if (!hit && !fileExt.empty() && extSet.count(fileExt)) {
            hit = true;
        }
        // 支持无扩展名但以 ~ 结尾的临时文件或特定文件名后缀匹配
        if (!hit) {
            for (const auto& targetExt : extSet) {
                if (targetExt == ".~" && !fileNameLower.empty() && fileNameLower.back() == '~') {
                    hit = true;
                    fileExt = ".~";
                    break;
                }
            }
        }
        if (!hit) continue;

        std::uintmax_t fsize = entry.file_size(ec);
        if (ec) {
            ec.clear();
            continue;
        }
        if (fsize < minBytes) continue;

        auto ftime = entry.last_write_time(ec);
        std::string mtime = ec ? "未知时间" : formatFileTime(ftime);

        FileRecord rec;
        rec.path = entry.path();
        rec.ext = fileExt.empty() ? "(无后缀)" : fileExt;
        rec.size = fsize;
        rec.mtimeStr = mtime;
        rec.isDir = false;
        matches.push_back(std::move(rec));
    }

    std::cout << "\r  扫描结束：共遍历 " << scannedCount << " 个文件，命中 "
              << matches.size() << " 项。          \n";
    return matches;
}

// ==================== 各功能菜单 ====================
void featureExtensionSearch(const AppConfig& cfg) {
    std::cout << "\n" << clr(C_CYAN + C_BOLD) << "=== 按后缀搜索并清理 ===" << clr(C_RESET) << "\n";
    std::cout << "选择后缀方式：\n"
              << "  [1] 自定义输入后缀（例如: .log .tmp .bak 或 log tmp）\n"
              << "  [2] 临时与日志预设 (.tmp .temp .log .dmp .cache)\n"
              << "  [3] 备份与下载残留 (.bak .old .orig .part .crdownload .swp)\n"
              << "  [4] 安装包与归档预设 (.apk .apks .xapk .zip .rar .7z)\n"
              << "  [0] 返回\n";

    std::string ch = readLine("请选择: ");
    std::vector<std::string> exts;
    if (ch == "0") return;
    if (ch == "1") {
        std::string raw = readLine("请输入文件后缀（多个后缀用空格或逗号分隔）: ");
        exts = parseExtensions(raw);
    } else if (ch == "2") {
        exts = {".tmp", ".temp", ".log", ".dmp", ".cache"};
    } else if (ch == "3") {
        exts = {".bak", ".old", ".orig", ".part", ".crdownload", ".swp"};
    } else if (ch == "4") {
        exts = {".apk", ".apks", ".xapk", ".zip", ".rar", ".7z"};
    } else {
        std::cout << clr(C_RED) << "无效选择。\n" << clr(C_RESET);
        return;
    }

    if (exts.empty()) {
        std::cout << clr(C_RED) << "未检测到有效后缀，取消搜索。\n" << clr(C_RESET);
        return;
    }

    std::cout << "已选择后缀: ";
    for (size_t i = 0; i < exts.size(); ++i) {
        std::cout << clr(C_GREEN) << exts[i] << clr(C_RESET) << (i + 1 < exts.size() ? ", " : "\n");
    }

    fs::path dir = chooseTargetDirectory(cfg);
    if (dir.empty()) return;

    std::string minMbStr = readLine("最小文件体积过滤 (MB，直接回车不过滤): ");
    std::uintmax_t minBytes = 0;
    if (!minMbStr.empty()) {
        try {
            double mb = std::stod(minMbStr);
            if (mb > 0) minBytes = static_cast<std::uintmax_t>(mb * 1024.0 * 1024.0);
        } catch (...) {}
    }

    std::string depthStr = readLine("最大递归深度 (直接回车为不限制): ");
    int maxDepth = -1;
    if (!depthStr.empty()) {
        try {
            maxDepth = std::stoi(depthStr);
        } catch (...) {
            maxDepth = -1;
        }
    }

    auto results = scanFilesByExtensions(cfg, dir, exts, minBytes, maxDepth, true);
    reviewAndAskToDelete(cfg, results, "指定后缀清理");
}

void featureQuickJunkScan(const AppConfig& cfg) {
    fs::path dir = chooseTargetDirectory(cfg);
    if (dir.empty()) return;

    std::vector<std::string> junkExts = {
        ".tmp", ".temp", ".log", ".bak", ".old", ".cache",
        ".dmp", ".chk", ".part", ".crdownload", ".swp", ".~"
    };
    auto results = scanFilesByExtensions(cfg, dir, junkExts, 0, -1, true);

    // 补充检查常见系统垃圾文件名（Thumbs.db, .DS_Store）
    std::error_code ec;
    fs::recursive_directory_iterator it(dir, fs::directory_options::skip_permission_denied, ec);
    for (; it != fs::recursive_directory_iterator(); it.increment(ec)) {
        if (ec) {
            ec.clear();
            continue;
        }
        if (it->is_directory(ec)) {
            if (shouldExcludePath(it->path(), cfg, true)) it.disable_recursion_pending();
            continue;
        }
        if (!it->is_regular_file(ec)) continue;
        std::string fname = it->path().filename().string();
        if (fname == "Thumbs.db" || fname == ".DS_Store" || fname == "desktop.ini") {
            FileRecord r;
            r.path = it->path();
            r.ext = "(系统残留)";
            r.size = it->file_size(ec);
            r.mtimeStr = formatFileTime(it->last_write_time(ec));
            results.push_back(std::move(r));
        }
    }

    reviewAndAskToDelete(cfg, results, "常见无用/垃圾文件扫描");
}

void featureLargeFiles(const AppConfig& cfg) {
    fs::path dir = chooseTargetDirectory(cfg);
    if (dir.empty()) return;

    std::string mbStr = readLine("请输入大文件门槛大小 (MB，默认 50): ");
    double mb = 50.0;
    if (!mbStr.empty()) {
        try {
            mb = std::max(0.01, std::stod(mbStr));
        } catch (...) {}
    }
    std::uintmax_t minBytes = static_cast<std::uintmax_t>(mb * 1024.0 * 1024.0);

    auto results = scanFilesByExtensions(cfg, dir, {"*"}, minBytes, -1, false);
    std::sort(results.begin(), results.end(), [](const FileRecord& a, const FileRecord& b) {
        return a.size > b.size;
    });
    reviewAndAskToDelete(cfg, results, "大文件扫描 (>= " + mbStr + " MB)");
}

void featureEmptyAndZeroByte(const AppConfig& cfg) {
    fs::path dir = chooseTargetDirectory(cfg);
    if (dir.empty()) return;

    std::vector<FileRecord> results;
    std::error_code ec;
    std::cout << clr(C_CYAN) << "\n正在扫描空文件夹与 0 字节文件...\n" << clr(C_RESET);

    fs::recursive_directory_iterator it(dir, fs::directory_options::skip_permission_denied, ec);
    for (; it != fs::recursive_directory_iterator(); it.increment(ec)) {
        if (ec) {
            ec.clear();
            continue;
        }
        if (it->is_symlink(ec)) {
            if (it->is_directory(ec)) it.disable_recursion_pending();
            continue;
        }
        if (it->is_directory(ec)) {
            if (shouldExcludePath(it->path(), cfg, true)) {
                it.disable_recursion_pending();
                continue;
            }
            if (fs::is_empty(it->path(), ec) && !ec) {
                FileRecord r;
                r.path = it->path();
                r.ext = "(空目录)";
                r.size = 0;
                r.mtimeStr = formatFileTime(it->last_write_time(ec));
                r.isDir = true;
                results.push_back(std::move(r));
            }
        } else if (it->is_regular_file(ec)) {
            if (it->file_size(ec) == 0 && !ec) {
                FileRecord r;
                r.path = it->path();
                r.ext = "(0字节文件)";
                r.size = 0;
                r.mtimeStr = formatFileTime(it->last_write_time(ec));
                r.isDir = false;
                results.push_back(std::move(r));
            }
        }
    }

    reviewAndAskToDelete(cfg, results, "空目录与 0 字节文件");
}

void featureApkCleaner(const AppConfig& cfg) {
    fs::path dir = chooseTargetDirectory(cfg);
    if (dir.empty()) return;

    auto results = scanFilesByExtensions(cfg, dir, {".apk", ".apks", ".xapk"}, 0, -1, false);
    std::sort(results.begin(), results.end(), [](const FileRecord& a, const FileRecord& b) {
        return a.size > b.size;
    });
    reviewAndAskToDelete(cfg, results, "APK 安装包扫描");
}

void featureSettings(AppConfig& cfg) {
    while (true) {
        std::cout << "\n" << clr(C_CYAN + C_BOLD) << "=== 设置与安全选项 ===" << clr(C_RESET) << "\n";
        std::cout << "  [1] 切换模拟演练模式 (Dry-Run): "
                  << (g_dryRun ? clr(C_YELLOW) + "开启 (安全模式，不真删)" : clr(C_GREEN) + "关闭 (执行真实删除)")
                  << clr(C_RESET) << "\n";
        std::cout << "  [2] 查看/添加排除目录关键词 (当前:";
        for (const auto& ex : cfg.excludedFolderNames) std::cout << " " << ex;
        std::cout << ")\n";
        std::cout << "  [3] 查看清理操作日志 (" << cfg.logFile.string() << ")\n";
        std::cout << "  [4] 重新运行权限检查向导\n";
        std::cout << "  [0] 返回主菜单\n";

        std::string ch = readLine("请选择: ");
        if (ch == "0") return;
        if (ch == "1") {
            g_dryRun = !g_dryRun;
            std::cout << clr(C_YELLOW) << "模拟演练模式已" << (g_dryRun ? "开启" : "关闭") << "。\n" << clr(C_RESET);
        } else if (ch == "2") {
            std::string add = readLine("输入要排除的目录名（直接回车不修改）: ");
            if (!add.empty()) {
                cfg.excludedFolderNames.push_back(add);
                std::cout << clr(C_GREEN) << "已添加排除目录: " << add << clr(C_RESET) << "\n";
            }
        } else if (ch == "3") {
            std::ifstream ifs(cfg.logFile);
            if (!ifs) {
                std::cout << clr(C_DIM) << "暂无清理日志。\n" << clr(C_RESET);
            } else {
                std::cout << "\n--- 最近清理日志 ---\n";
                std::string line;
                while (std::getline(ifs, line)) {
                    std::cout << "  " << line << "\n";
                }
            }
            pausePrompt();
        } else if (ch == "4") {
            if (!runPermissionWizard(cfg)) {
                std::exit(0);
            }
        }
    }
}

void printHelp(const char* prog) {
    std::cout << "用法: " << prog << " [选项]\n"
              << "选项:\n"
              << "  -h, --help       显示帮助信息\n"
              << "  --dry-run        以模拟演练模式启动（不真正删除文件）\n"
              << "  --no-color       禁用终端 ANSI 颜色输出\n";
}

} // namespace

int main(int argc, char* argv[]) {
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "-h" || arg == "--help") {
            printHelp(argv[0]);
            return 0;
        } else if (arg == "--dry-run") {
            g_dryRun = true;
        } else if (arg == "--no-color") {
            g_useColor = false;
        }
    }

    AppConfig cfg;
    // 启动后先强制进行权限检查与授权确认
    if (!runPermissionWizard(cfg)) {
        return 0;
    }

    while (true) {
        printBanner();
        std::cout << clr(C_GREEN) << "  [✓] 权限状态: 已授权"
                  << (cfg.storageAccessible ? "（支持手机共享存储）" : "（本地目录模式）")
                  << clr(C_RESET) << "\n\n";
        std::cout << "主菜单（多功能清理中心）：\n"
                  << "  [1] 🔍 按指定后缀搜索并清理（自定义或预设后缀）\n"
                  << "  [2] 🧹 一键扫描常见系统/应用垃圾文件\n"
                  << "  [3] 📦 大文件猎手（按体积阈值扫描排序）\n"
                  << "  [4] 📂 空文件夹与 0 字节文件清理\n"
                  << "  [5] 📱 APK 安装包专项扫描清理\n"
                  << "  [6] 🗑️ 安全回收站管理（还原 / 彻底清空）\n"
                  << "  [7] 🛡️ 设置、模拟模式与清理日志\n"
                  << "  [0] 🚪 退出程序\n";

        std::string choice = readLine("\n请输入功能编号 [0-7]: ");
        if (choice == "0") {
            std::cout << clr(C_CYAN) << "感谢使用 Termux 智能文件清理工具，再见！\n" << clr(C_RESET);
            break;
        } else if (choice == "1") {
            featureExtensionSearch(cfg);
        } else if (choice == "2") {
            featureQuickJunkScan(cfg);
        } else if (choice == "3") {
            featureLargeFiles(cfg);
        } else if (choice == "4") {
            featureEmptyAndZeroByte(cfg);
        } else if (choice == "5") {
            featureApkCleaner(cfg);
        } else if (choice == "6") {
            manageTrashMenu(cfg);
        } else if (choice == "7") {
            featureSettings(cfg);
        } else {
            std::cout << clr(C_RED) << "无效菜单编号，请重新选择。\n" << clr(C_RESET);
        }
    }

    return 0;
}
