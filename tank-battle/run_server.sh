#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if [ -n "${TERMUX_VERSION:-}" ] || [[ "${PREFIX:-}" == *"com.termux"* ]]; then
    if ! command -v clang++ >/dev/null 2>&1 && ! command -v g++ >/dev/null 2>&1; then
        echo "[*] 正在安装 clang..."
        pkg update -y && pkg install -y clang
    fi
fi

CXX=""
if command -v clang++ >/dev/null 2>&1; then
    CXX="clang++"
elif command -v g++ >/dev/null 2>&1; then
    CXX="g++"
else
    echo "[错误] 未找到 C++17 编译器 (clang++ / g++)"
    exit 1
fi

echo "[*] 使用 $CXX 编译 C++17 引擎测试..."
"$CXX" -std=c++17 -O2 -Wall -Wextra -Werror src/tank_core.cpp tests/test_tank.cpp -o /tmp/tank_tests
/tmp/tank_tests
rm -f /tmp/tank_tests

echo "[*] 编译 C++17 游戏服务端 (tank_server)..."
"$CXX" -std=c++17 -O2 -Wall -Wextra -Werror src/tank_core.cpp src/server_main.cpp -o tank_server
chmod +x tank_server

PORT="${1:-8080}"
echo "[✓] 启动成功！请在手机或电脑浏览器打开: http://127.0.0.1:${PORT}"
exec ./tank_server "$PORT"
