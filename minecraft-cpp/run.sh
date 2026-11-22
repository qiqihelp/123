#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

CXX=""
if command -v g++ >/dev/null 2>&1; then
    CXX="g++"
elif command -v clang++ >/dev/null 2>&1; then
    CXX="clang++"
else
    echo "[错误] 未找到 C++17 编译器，请先安装: sudo apt install -y g++"
    exit 1
fi

echo "[*] 使用 $CXX 编译 C++17 体素引擎测试..."
"$CXX" -std=c++17 -O2 -Wall -Wextra -I src src/voxel_core.cpp tests/test_voxel.cpp -o /tmp/voxel_tests
/tmp/voxel_tests
rm -f /tmp/voxel_tests

echo "[*] 编译 C++17 Minecraft 服务端 (voxel_server)..."
"$CXX" -std=c++17 -O2 -Wall -Wextra -pthread -I src src/voxel_core.cpp src/server_main.cpp -o voxel_server
chmod +x voxel_server

PORT="${1:-8081}"
echo "[✓] 启动成功！请在浏览器打开: http://127.0.0.1:${PORT}"
exec ./voxel_server "$PORT"
