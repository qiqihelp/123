#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$SCRIPT_DIR/cleaner.cpp"
BIN="$SCRIPT_DIR/cleaner"

echo "=========================================="
echo "  Termux C++ 清理工具 一键编译与启动脚本"
echo "=========================================="

# 检测 Termux 环境并提示存储权限
if [ -n "${TERMUX_VERSION:-}" ] || [[ "${PREFIX:-}" == *"com.termux"* ]]; then
    echo "[*] 检测到 Termux 环境。"
    if [ ! -d "$HOME/storage/shared" ]; then
        echo "[!] 尚未检测到 ~/storage/shared，请先授予 Termux 存储权限..."
        if command -v termux-setup-storage >/dev/null 2>&1; then
            termux-setup-storage || true
            echo "[*] 如果系统弹出权限请求窗口，请点击【允许】，然后按回车继续..."
            read -r _
        fi
    fi

    # 检查编译器
    if ! command -v clang++ >/dev/null 2>&1 && ! command -v g++ >/dev/null 2>&1; then
        echo "[*] 未检测到 C++ 编译器，正在通过 pkg 安装 clang..."
        pkg update -y && pkg install -y clang
    fi
fi

CXX=""
if command -v clang++ >/dev/null 2>&1; then
    CXX="clang++"
elif command -v g++ >/dev/null 2>&1; then
    CXX="g++"
else
    echo "[错误] 未找到 clang++ 或 g++，请先安装 C++ 编译器。"
    exit 1
fi

echo "[*] 使用 $CXX 编译 cleaner.cpp ..."
"$CXX" -std=c++17 -O2 -Wall -Wextra "$SRC" -o "$BIN"
chmod +x "$BIN"
echo "[✓] 编译完成，已授予可执行权限: $BIN"
echo ""

exec "$BIN" "$@"
