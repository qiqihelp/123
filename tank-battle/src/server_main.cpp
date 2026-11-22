#include "tank_core.hpp"

#include <algorithm>
#include <arpa/inet.h>
#include <cerrno>
#include <csignal>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <mutex>
#include <netinet/in.h>
#include <sstream>
#include <string>
#include <sys/socket.h>
#include <unistd.h>
#include <vector>

namespace fs = std::filesystem;

namespace {

struct ScoreEntry {
    std::string name;
    int score = 0;
    int stage = 1;
};

std::mutex g_scoreMutex;
fs::path g_webRoot;
fs::path g_scoreFile;

std::string jsonEscape(const std::string& s) {
    std::string out;
    out.reserve(s.size());
    for (char c : s) {
        if (c == '"' || c == '\\') {
            out.push_back('\\');
            out.push_back(c);
        } else if (static_cast<unsigned char>(c) >= 32) {
            out.push_back(c);
        }
    }
    return out;
}

std::vector<ScoreEntry> loadScores() {
    std::vector<ScoreEntry> list;
    std::ifstream ifs(g_scoreFile);
    std::string line;
    while (std::getline(ifs, line)) {
        if (line.empty()) continue;
        std::istringstream iss(line);
        ScoreEntry e;
        std::string scoreStr, stageStr;
        if (std::getline(iss, e.name, '\t') &&
            std::getline(iss, scoreStr, '\t') &&
            std::getline(iss, stageStr)) {
            try {
                e.score = std::stoi(scoreStr);
                e.stage = std::stoi(stageStr);
                list.push_back(e);
            } catch (...) {}
        }
    }
    std::sort(list.begin(), list.end(), [](const ScoreEntry& a, const ScoreEntry& b) {
        return a.score > b.score;
    });
    if (list.size() > 10) list.resize(10);
    return list;
}

void saveScores(const std::vector<ScoreEntry>& list) {
    std::ofstream ofs(g_scoreFile, std::ios::trunc);
    for (const auto& e : list) {
        ofs << e.name << "\t" << e.score << "\t" << e.stage << "\n";
    }
}

std::string scoresToJson(const std::vector<ScoreEntry>& list) {
    std::ostringstream oss;
    oss << "{\"scores\":[";
    for (size_t i = 0; i < list.size(); ++i) {
        if (i > 0) oss << ",";
        oss << "{\"name\":\"" << jsonEscape(list[i].name)
            << "\",\"score\":" << list[i].score
            << ",\"stage\":" << list[i].stage << "}";
    }
    oss << "]}";
    return oss.str();
}

std::string extractJsonString(const std::string& body, const std::string& key, const std::string& defVal) {
    std::string pat = "\"" + key + "\"";
    auto pos = body.find(pat);
    if (pos == std::string::npos) return defVal;
    pos = body.find(':', pos + pat.size());
    if (pos == std::string::npos) return defVal;
    pos = body.find('"', pos);
    if (pos == std::string::npos) return defVal;
    auto end = body.find('"', pos + 1);
    if (end == std::string::npos) return defVal;
    std::string val = body.substr(pos + 1, end - pos - 1);
    for (char& c : val) {
        if (c == '\t' || c == '\n' || c == '\r') c = ' ';
    }
    if (val.empty()) return defVal;
    if (val.size() > 16) val.resize(16);
    return val;
}

int extractJsonInt(const std::string& body, const std::string& key, int defVal) {
    std::string pat = "\"" + key + "\"";
    auto pos = body.find(pat);
    if (pos == std::string::npos) return defVal;
    pos = body.find(':', pos + pat.size());
    if (pos == std::string::npos) return defVal;
    ++pos;
    while (pos < body.size() && (body[pos] == ' ' || body[pos] == '\t')) ++pos;
    try {
        return std::stoi(body.substr(pos));
    } catch (...) {
        return defVal;
    }
}

std::string mimeTypeFor(const fs::path& p) {
    std::string ext = p.extension().string();
    if (ext == ".html" || ext == ".htm") return "text/html; charset=utf-8";
    if (ext == ".js") return "application/javascript; charset=utf-8";
    if (ext == ".wasm") return "application/wasm";
    if (ext == ".css") return "text/css; charset=utf-8";
    if (ext == ".json") return "application/json; charset=utf-8";
    if (ext == ".png") return "image/png";
    return "application/octet-stream";
}

void sendAll(int fd, const std::string& data) {
    size_t sent = 0;
    while (sent < data.size()) {
        ssize_t n = ::send(fd, data.data() + sent, data.size() - sent, 0);
        if (n <= 0) break;
        sent += static_cast<size_t>(n);
    }
}

void sendResponse(int fd, int status, const std::string& statusText,
                  const std::string& contentType, const std::string& body) {
    std::ostringstream oss;
    oss << "HTTP/1.1 " << status << " " << statusText << "\r\n"
        << "Content-Type: " << contentType << "\r\n"
        << "Content-Length: " << body.size() << "\r\n"
        << "Cache-Control: no-cache\r\n"
        << "Access-Control-Allow-Origin: *\r\n"
        << "Connection: close\r\n\r\n"
        << body;
    sendAll(fd, oss.str());
}

void handleClient(int clientFd) {
    std::string req;
    req.reserve(4096);
    char buf[4096];
    size_t headerEnd = std::string::npos;
    int contentLength = 0;

    while (true) {
        ssize_t n = ::recv(clientFd, buf, sizeof(buf), 0);
        if (n <= 0) break;
        req.append(buf, static_cast<size_t>(n));
        if (headerEnd == std::string::npos) {
            headerEnd = req.find("\r\n\r\n");
            if (headerEnd != std::string::npos) {
                std::string headers = req.substr(0, headerEnd);
                auto clPos = headers.find("Content-Length:");
                if (clPos == std::string::npos) clPos = headers.find("content-length:");
                if (clPos != std::string::npos) {
                    try {
                        contentLength = std::stoi(headers.substr(clPos + 15));
                    } catch (...) {
                        contentLength = 0;
                    }
                }
            }
        }
        if (headerEnd != std::string::npos) {
            size_t totalNeeded = headerEnd + 4 + static_cast<size_t>(std::max(0, contentLength));
            if (req.size() >= totalNeeded || req.size() > 65536) break;
        }
        if (req.size() > 65536) break;
    }

    if (req.empty() || headerEnd == std::string::npos) {
        ::close(clientFd);
        return;
    }

    std::istringstream lineStream(req.substr(0, req.find("\r\n")));
    std::string method, rawPath;
    lineStream >> method >> rawPath;

    auto qPos = rawPath.find('?');
    std::string path = (qPos == std::string::npos) ? rawPath : rawPath.substr(0, qPos);
    std::string body = req.substr(headerEnd + 4);

    if (method == "OPTIONS") {
        sendResponse(clientFd, 204, "No Content", "text/plain", "");
        ::close(clientFd);
        return;
    }

    if (path == "/api/health") {
        sendResponse(clientFd, 200, "OK", "application/json; charset=utf-8",
                     "{\"ok\":true,\"engine\":\"C++17 Tank Battle\",\"width\":" +
                     std::to_string(tank::SCREEN_W) + ",\"height\":" +
                     std::to_string(tank::SCREEN_H) + "}");
        ::close(clientFd);
        return;
    }

    if (path == "/api/scores") {
        std::lock_guard<std::mutex> lock(g_scoreMutex);
        if (method == "GET") {
            auto list = loadScores();
            sendResponse(clientFd, 200, "OK", "application/json; charset=utf-8", scoresToJson(list));
        } else if (method == "POST") {
            std::string name = extractJsonString(body, "name", "PLAYER");
            int sc = std::max(0, extractJsonInt(body, "score", 0));
            int st = std::clamp(extractJsonInt(body, "stage", 1), 1, 5);
            auto list = loadScores();
            if (sc > 0) {
                list.push_back({name, sc, st});
                std::sort(list.begin(), list.end(), [](const ScoreEntry& a, const ScoreEntry& b) {
                    return a.score > b.score;
                });
                if (list.size() > 10) list.resize(10);
                saveScores(list);
            }
            sendResponse(clientFd, 200, "OK", "application/json; charset=utf-8", scoresToJson(list));
        } else {
            sendResponse(clientFd, 405, "Method Not Allowed", "text/plain", "Method Not Allowed");
        }
        ::close(clientFd);
        return;
    }

    // 静态网页服务
    if (path == "/") path = "/index.html";
    if (path.find("..") != std::string::npos) {
        sendResponse(clientFd, 403, "Forbidden", "text/plain", "Forbidden");
        ::close(clientFd);
        return;
    }

    fs::path filePath = g_webRoot / path.substr(1);
    std::error_code ec;
    if (!fs::exists(filePath, ec) || !fs::is_regular_file(filePath, ec)) {
        sendResponse(clientFd, 404, "Not Found", "text/plain", "Not Found");
        ::close(clientFd);
        return;
    }

    std::ifstream ifs(filePath, std::ios::binary);
    std::ostringstream content;
    content << ifs.rdbuf();
    sendResponse(clientFd, 200, "OK", mimeTypeFor(filePath), content.str());
    ::close(clientFd);
}

} // namespace

int main(int argc, char* argv[]) {
    std::signal(SIGPIPE, SIG_IGN);

    int port = 8080;
    if (argc >= 2) {
        try {
            port = std::stoi(argv[1]);
        } catch (...) {}
    }
    if (const char* envPort = std::getenv("PORT")) {
        try {
            port = std::stoi(envPort);
        } catch (...) {}
    }

    fs::path exeDir = fs::current_path();
    if (fs::exists(exeDir / "web" / "index.html")) {
        g_webRoot = exeDir / "web";
        g_scoreFile = exeDir / "tank_scores.tsv";
    } else if (fs::exists(exeDir / "tank-battle" / "web" / "index.html")) {
        g_webRoot = exeDir / "tank-battle" / "web";
        g_scoreFile = exeDir / "tank-battle" / "tank_scores.tsv";
    } else {
        std::cerr << "Error: cannot find web/index.html from " << exeDir << "\n";
        return 1;
    }

    // 启动时做一次核心引擎自检
    tank::TankGame selfCheck;
    selfCheck.startNewGame();
    selfCheck.render();

    int serverFd = ::socket(AF_INET, SOCK_STREAM, 0);
    if (serverFd < 0) {
        std::cerr << "socket() failed: " << std::strerror(errno) << "\n";
        return 1;
    }

    int opt = 1;
    ::setsockopt(serverFd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY; // 0.0.0.0
    addr.sin_port = htons(static_cast<uint16_t>(port));

    if (::bind(serverFd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) < 0) {
        std::cerr << "bind(0.0.0.0:" << port << ") failed: " << std::strerror(errno) << "\n";
        ::close(serverFd);
        return 1;
    }

    if (::listen(serverFd, 32) < 0) {
        std::cerr << "listen() failed: " << std::strerror(errno) << "\n";
        ::close(serverFd);
        return 1;
    }

    std::cout << "C++17 Tank Battle Server listening on http://0.0.0.0:" << port << std::endl;
    std::cout << "Serving web root: " << g_webRoot << std::endl;

    while (true) {
        sockaddr_in clientAddr{};
        socklen_t clientLen = sizeof(clientAddr);
        int clientFd = ::accept(serverFd, reinterpret_cast<sockaddr*>(&clientAddr), &clientLen);
        if (clientFd < 0) continue;
        handleClient(clientFd);
    }

    ::close(serverFd);
    return 0;
}
