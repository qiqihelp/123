#include "voxel_core.hpp"

#include <algorithm>
#include <arpa/inet.h>
#include <cerrno>
#include <chrono>
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

voxel::VoxelWorld g_world(20261121u);
std::mutex g_worldMutex;
fs::path g_webRoot;
fs::path g_savePath;

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

void sendAll(int fd, const char* data, size_t len) {
    size_t sent = 0;
    while (sent < len) {
        ssize_t n = ::send(fd, data + sent, len - sent, 0);
        if (n <= 0) break;
        sent += static_cast<size_t>(n);
    }
}

void sendResponse(int fd, int status, const std::string& statusText,
                  const std::string& contentType, const char* data, size_t len,
                  const std::string& extraHeaders = "") {
    std::ostringstream oss;
    oss << "HTTP/1.1 " << status << " " << statusText << "\r\n"
        << "Content-Type: " << contentType << "\r\n"
        << "Content-Length: " << len << "\r\n"
        << "Cache-Control: no-cache\r\n"
        << "Access-Control-Allow-Origin: *\r\n"
        << extraHeaders
        << "Connection: close\r\n\r\n";
    std::string hdr = oss.str();
    sendAll(fd, hdr.data(), hdr.size());
    if (len > 0) sendAll(fd, data, len);
}

void sendText(int fd, int status, const std::string& statusText,
              const std::string& contentType, const std::string& body,
              const std::string& extraHeaders = "") {
    sendResponse(fd, status, statusText, contentType, body.data(), body.size(), extraHeaders);
}

std::string mimeTypeFor(const fs::path& p) {
    std::string ext = p.extension().string();
    if (ext == ".html" || ext == ".htm") return "text/html; charset=utf-8";
    if (ext == ".js") return "application/javascript; charset=utf-8";
    if (ext == ".css") return "text/css; charset=utf-8";
    if (ext == ".json") return "application/json; charset=utf-8";
    return "application/octet-stream";
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
        sendText(clientFd, 204, "No Content", "text/plain", "");
        ::close(clientFd);
        return;
    }

    if (path == "/api/health") {
        std::lock_guard<std::mutex> lock(g_worldMutex);
        float sx = 32.5f, sy = 20.0f, sz = 32.5f;
        g_world.findSafeSpawn(sx, sy, sz);
        std::ostringstream oss;
        oss << "{\"ok\":true,\"engine\":\"C++17 VoxelCraft\",\"seed\":" << g_world.seed()
            << ",\"dims\":[" << voxel::WORLD_X << "," << voxel::WORLD_Y << "," << voxel::WORLD_Z << "]"
            << ",\"spawn\":[" << sx << "," << sy << "," << sz << "]}";
        sendText(clientFd, 200, "OK", "application/json; charset=utf-8", oss.str());
        ::close(clientFd);
        return;
    }

    if (path == "/api/world" && method == "GET") {
        std::lock_guard<std::mutex> lock(g_worldMutex);
        float sx = 32.5f, sy = 20.0f, sz = 32.5f;
        g_world.findSafeSpawn(sx, sy, sz);
        std::ostringstream hdr;
        hdr << "X-World-Dims: " << voxel::WORLD_X << "," << voxel::WORLD_Y << "," << voxel::WORLD_Z << "\r\n"
            << "X-Spawn: " << sx << "," << sy << "," << sz << "\r\n"
            << "X-Seed: " << g_world.seed() << "\r\n"
            << "Access-Control-Expose-Headers: X-World-Dims, X-Spawn, X-Seed\r\n";
        sendResponse(clientFd, 200, "OK", "application/octet-stream",
                     reinterpret_cast<const char*>(g_world.rawData()), g_world.rawSize(), hdr.str());
        ::close(clientFd);
        return;
    }

    if (path == "/api/block" && method == "POST") {
        int x = extractJsonInt(body, "x", -1);
        int y = extractJsonInt(body, "y", -1);
        int z = extractJsonInt(body, "z", -1);
        int id = extractJsonInt(body, "id", 0);
        std::lock_guard<std::mutex> lock(g_worldMutex);
        bool ok = g_world.setBlock(x, y, z, static_cast<voxel::BlockId>(std::clamp(id, 0, 16)));
        if (ok) g_world.saveToFile(g_savePath.string());
        sendText(clientFd, 200, "OK", "application/json; charset=utf-8",
                 std::string("{\"ok\":") + (ok ? "true" : "false") + "}");
        ::close(clientFd);
        return;
    }

    if (path == "/api/explode" && method == "POST") {
        int x = extractJsonInt(body, "x", -1);
        int y = extractJsonInt(body, "y", -1);
        int z = extractJsonInt(body, "z", -1);
        std::lock_guard<std::mutex> lock(g_worldMutex);
        auto destroyed = g_world.detonateTNT(x, y, z, 3.5f);
        g_world.saveToFile(g_savePath.string());
        std::ostringstream oss;
        oss << "{\"ok\":true,\"destroyed\":[";
        for (size_t i = 0; i < destroyed.size(); ++i) {
            if (i > 0) oss << ",";
            oss << "[" << destroyed[i].x << "," << destroyed[i].y << "," << destroyed[i].z << "]";
        }
        oss << "]}";
        sendText(clientFd, 200, "OK", "application/json; charset=utf-8", oss.str());
        ::close(clientFd);
        return;
    }

    if (path == "/api/reset" && method == "POST") {
        uint32_t newSeed = static_cast<uint32_t>(
            std::chrono::high_resolution_clock::now().time_since_epoch().count() & 0x7FFFFFFFu);
        if (newSeed == 0) newSeed = 123456u;
        std::lock_guard<std::mutex> lock(g_worldMutex);
        g_world.generate(newSeed);
        g_world.saveToFile(g_savePath.string());
        sendText(clientFd, 200, "OK", "application/json; charset=utf-8",
                 "{\"ok\":true,\"seed\":" + std::to_string(newSeed) + "}");
        ::close(clientFd);
        return;
    }

    if (path == "/") path = "/index.html";
    if (path.find("..") != std::string::npos) {
        sendText(clientFd, 403, "Forbidden", "text/plain", "Forbidden");
        ::close(clientFd);
        return;
    }

    fs::path filePath = g_webRoot / path.substr(1);
    std::error_code ec;
    if (!fs::exists(filePath, ec) || !fs::is_regular_file(filePath, ec)) {
        sendText(clientFd, 404, "Not Found", "text/plain", "Not Found");
        ::close(clientFd);
        return;
    }

    std::ifstream ifs(filePath, std::ios::binary);
    std::ostringstream content;
    content << ifs.rdbuf();
    sendText(clientFd, 200, "OK", mimeTypeFor(filePath), content.str());
    ::close(clientFd);
}

} // namespace

int main(int argc, char* argv[]) {
    std::signal(SIGPIPE, SIG_IGN);

    int port = 8081;
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
        g_savePath = exeDir / "world_save.bin";
    } else if (fs::exists(exeDir / "minecraft-cpp" / "web" / "index.html")) {
        g_webRoot = exeDir / "minecraft-cpp" / "web";
        g_savePath = exeDir / "minecraft-cpp" / "world_save.bin";
    } else {
        std::cerr << "Error: cannot find web/index.html from " << exeDir << "\n";
        return 1;
    }

    if (!g_world.loadFromFile(g_savePath.string())) {
        g_world.generate(20261121u);
        g_world.saveToFile(g_savePath.string());
    }

    int serverFd = ::socket(AF_INET, SOCK_STREAM, 0);
    if (serverFd < 0) {
        std::cerr << "socket() failed: " << std::strerror(errno) << "\n";
        return 1;
    }

    int opt = 1;
    ::setsockopt(serverFd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
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

    std::cout << "C++17 VoxelCraft (Minecraft) Server listening on http://0.0.0.0:" << port << std::endl;
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
