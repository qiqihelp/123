# Termux C++ 多功能文件清理脚本 (`termux-cleaner`)

一个专为 **Termux (Android)** 及 POSIX 终端编写的 **C++17 零依赖文件清理工具**。
程序启动后会**先检查并要求授予权限**（包括 Termux 存储访问权限 `termux-setup-storage` 与操作授权确认），再提供按后缀搜索、垃圾扫描、大文件查找、空目录清理、安全回收站等丰富功能；**每次搜索完成后都会先展示统计与文件列表，再询问是否删除**，避免误删。

---

## ✨ 主要功能

1. **启动前权限检查与授权向导**
   - 自动识别 Termux 环境与 `$HOME/storage/shared`、`/sdcard` 读写状态
   - 支持在程序内直接触发 `termux-setup-storage` 申请 Android 存储权限
   - 进入清理菜单前需要用户明确确认授权

2. **按指定后缀搜索并清理**
   - 支持自定义输入任意多个后缀（如 `.log .tmp .bak` 或 `log,tmp,apk`，自动兼容大小写）
   - 内置常用后缀预设（临时/日志、备份/下载残留、安装包/归档）
   - 支持按最小文件体积（MB）、递归深度、目录选择进行过滤

3. **搜索完毕后先预览、再询问是否删除**
   - 搜索结束后按后缀分类汇总数量与总占用空间
   - 展示带编号、大小、修改时间和完整路径的列表（支持查看全部或导出报告）
   - 询问用户选择处理方式：
     - 移入**安全回收站**（可随时还原，支持跨挂载点移动）
     - 彻底**永久删除**（需手动输入 `YES` 二次确认）
     - **按编号选择**删除（如 `1 3 5-8`）
     - **按后缀筛选**删除（如只删 `.tmp`）
     - 不删除直接返回

4. **其他实用功能**
   - 一键扫描常见系统/应用垃圾（`.tmp`、`.log`、`.bak`、`.cache`、`.part`、`.crdownload`、`Thumbs.db` 等）
   - 大文件猎手（自定义 MB 阈值，按体积从大到小排列）
   - 空文件夹与 0 字节文件清理
   - APK 安装包专项清理（`.apk` / `.apks` / `.xapk`）
   - 安全回收站管理（查看、还原到原路径、彻底清空）
   - 全局 **Dry-Run 模拟演练模式**（`--dry-run`），只看不删
   - 受保护路径黑名单（拦截 `/`、`/system`、`$PREFIX` 等关键系统目录）

---

## 🚀 在 Termux 中使用

### 方法一：一键脚本授予权限、编译并运行

```bash
cd termux-cleaner
chmod +x run.sh
./run.sh
```

### 方法二：手动授予权限并编译

```bash
# 1. 在 Termux 中安装 C++ 编译器并授予存储权限
pkg update && pkg install -y clang
termux-setup-storage

# 2. 编译并授予可执行权限
cd termux-cleaner
clang++ -std=c++17 -O2 -Wall -Wextra cleaner.cpp -o cleaner
chmod +x cleaner

# 3. 运行（支持 --dry-run 模拟模式，--no-color 无颜色模式）
./cleaner
```

> 提示：如果在非 Termux 的普通 Linux 终端运行测试，同样支持 `g++ -std=c++17 -O2 cleaner.cpp -o cleaner && ./cleaner`。
