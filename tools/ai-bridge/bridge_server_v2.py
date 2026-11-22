#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🌉 AI Agent Bridge V3 — 完整 MCP 适配 + 终端配置 + Skill 管理
零依赖，Termux 原生 Python 直接跑

用法:
    python bridge_server_v2.py          # 进入终端配置菜单
    python bridge_server_v2.py --server # 直接启动服务器
    python bridge_server_v2.py -p 8080  # 指定端口
    python bridge_server_v2.py --no-auth# 关闭 Token 认证（不推荐，仅限纯本机调试）

安全模型 (V3 默认加固):
    · 默认只监听 127.0.0.1（局域网暴露需显式 --host 0.0.0.0，务必知悉风险）
    · 默认开启 Token 认证：所有接口都要求请求头 X-Bridge-Token
      Token 首次运行自动生成到 ~/.ai_bridge/token（权限 600），启动时打印
      也可用环境变量 BRIDGE_TOKEN 覆盖；--no-auth 或 BRIDGE_NO_AUTH=1 关闭
    · CORS 默认 *（Token 才是真正的边界），可用 ~/.ai_bridge/settings.json
      的 {"cors_origin": "https://chatgpt.com"} 收紧
    · 响应带 Access-Control-Allow-Private-Network: true（Chrome PNA 要求）
"""

import os
import sys
import json
import re
import hmac
import shlex
import atexit
import base64
import secrets
import subprocess
import threading
import time
import ast
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, quote, unquote
from urllib.request import Request, urlopen
from urllib.error import URLError
from html import unescape as html_unescape

# ========== 版本 ==========
VERSION = "3.0"

# ========== 路径配置 ==========
CONFIG_DIR = os.path.expanduser("~/.ai_bridge")
MCP_CONFIG_FILE = os.path.join(CONFIG_DIR, "mcp_config.json")
SKILLS_FILE = os.path.join(CONFIG_DIR, "skills.json")
CACHED_TOOLS_FILE = os.path.join(CONFIG_DIR, "cached_tools.json")
SETTINGS_FILE = os.path.join(CONFIG_DIR, "settings.json")
TOKEN_FILE = os.path.join(CONFIG_DIR, "token")
LOGS_DIR = os.path.join(CONFIG_DIR, "logs")

os.makedirs(CONFIG_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

PORT = int(os.environ.get("PORT", "8000"))
HOST = os.environ.get("HOST", "127.0.0.1")

AUTH_DISABLED = os.environ.get("BRIDGE_NO_AUTH", "") == "1"


# ========== 通用小工具 ==========

def load_settings():
    return load_json(SETTINGS_FILE, {"auth": True, "cors_origin": "*"})

def atomic_write_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)

def load_json(path, default):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print("⚠️  配置文件损坏，已使用默认值: " + path + " (" + str(e) + ")")
    return default

_token_cache = {"mtime": None, "value": None}

def current_token():
    """读取 Token（env 优先；否则读/生成 token 文件）。带 mtime 缓存避免每个请求都 IO。"""
    env_tok = os.environ.get("BRIDGE_TOKEN")
    if env_tok:
        return env_tok
    try:
        st = os.stat(TOKEN_FILE)
        if _token_cache["mtime"] == st.st_mtime_ns and _token_cache["value"]:
            return _token_cache["value"]
        with open(TOKEN_FILE, "r", encoding="utf-8") as f:
            tok = f.read().strip()
        if not tok:
            raise ValueError("empty token file")
        _token_cache["mtime"] = st.st_mtime_ns
        _token_cache["value"] = tok
        return tok
    except FileNotFoundError:
        tok = secrets.token_hex(16)
        with open(TOKEN_FILE, "w", encoding="utf-8") as f:
            f.write(tok + "\n")
        try:
            os.chmod(TOKEN_FILE, 0o600)
        except Exception:
            pass
        print("🔑 已生成新 Token: " + TOKEN_FILE)
        return tok
    except Exception as e:
        print("❌ 无法读取/生成 Token 文件 " + TOKEN_FILE + ": " + str(e))
        return None

def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s or "")


# ========== 本地工具函数 ==========

def execute_terminal(command: str, timeout: int = 30) -> str:
    try:
        timeout = max(1, min(int(timeout), 300))
    except Exception:
        timeout = 30
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, timeout=timeout
        )
        output = result.stdout
        if result.stderr:
            output += "\n[STDERR]: " + result.stderr
        if result.returncode != 0:
            output += "\n[EXIT CODE]: " + str(result.returncode)
        return output[:4000]
    except subprocess.TimeoutExpired:
        return "❌ 超时 (" + str(timeout) + "秒)"
    except Exception as e:
        return "❌ 错误: " + str(e)

def get_system_info() -> str:
    info = [
        "Platform: " + sys.platform,
        "Python: " + sys.version.split()[0],
        "CWD: " + os.getcwd(),
        "Bridge: V" + VERSION,
    ]
    try:
        import platform
        info.append("Machine: " + platform.machine())
    except Exception:
        pass
    try:
        info.append("Time: " + time.strftime("%Y-%m-%d %H:%M:%S %Z").strip())
    except Exception:
        pass
    return "\n".join(info)

def get_datetime() -> str:
    now = time.localtime()
    return (
        "本地时间: " + time.strftime("%Y-%m-%d %H:%M:%S", now) +
        "\n时区偏移: UTC" + time.strftime("%z", now) +
        "\nUnix 时间戳: " + str(int(time.time()))
    )

def calc(expression: str) -> str:
    """安全计算器：只允许数字、四则/幂/取模、括号、常用数学函数，杜绝代码注入。"""
    _funcs = {
        "sqrt": math_sqrt, "abs": abs, "floor": math_floor, "ceil": math_ceil,
        "sin": math_sin, "cos": math_cos, "tan": math_tan,
        "log": math_log, "log2": math_log2, "log10": math_log10,
    }
    _consts = {"pi": 3.141592653589793, "e": 2.718281828459045}
    try:
        tree = ast.parse(str(expression), mode="eval")
    except SyntaxError:
        return "❌ 表达式语法错误"

    def ev(node):
        if isinstance(node, ast.Expression):
            return ev(node.body)
        if isinstance(node, ast.Constant):
            if isinstance(node.value, bool):
                raise ValueError("不允许布尔值")
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError("只允许数字常量")
        if isinstance(node, ast.Name):
            if node.id in _consts:
                return _consts[node.id]
            raise ValueError("未知名称: " + node.id)
        if isinstance(node, ast.UnaryOp):
            v = ev(node.operand)
            if isinstance(node.op, ast.UAdd):
                return +v
            if isinstance(node.op, ast.USub):
                return -v
            raise ValueError("不允许的一元运算")
        if isinstance(node, ast.BinOp):
            l, r = ev(node.left), ev(node.right)
            op = node.op
            if isinstance(op, ast.Add):
                return l + r
            if isinstance(op, ast.Sub):
                return l - r
            if isinstance(op, ast.Mult):
                return l * r
            if isinstance(op, ast.Div):
                if r == 0:
                    raise ValueError("除数为 0")
                return l / r
            if isinstance(op, ast.FloorDiv):
                if r == 0:
                    raise ValueError("除数为 0")
                return l // r
            if isinstance(op, ast.Mod):
                if r == 0:
                    raise ValueError("取模除数为 0")
                return l % r
            if isinstance(op, ast.Pow):
                if abs(r) > 1000:
                    raise ValueError("指数过大")
                return l ** r
            raise ValueError("不允许的运算符")
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in _funcs:
                raise ValueError("不允许的函数（可用: " + ", ".join(sorted(_funcs)) + "）")
            if node.keywords:
                raise ValueError("不支持关键字参数")
            args = [ev(a) for a in node.args]
            return _funcs[node.func.id](*args)
        raise ValueError("不允许的表达式元素")

    try:
        result = ev(tree)
    except ValueError as e:
        return "❌ " + str(e)
    except OverflowError:
        return "❌ 结果溢出"
    except Exception as e:
        return "❌ 计算失败: " + str(e)
    if isinstance(result, float) and result.is_integer() and abs(result) < 1e16:
        result = int(result)
    return str(result)

# calc 用到的 math 函数（避免在函数体内重复 import 的混乱，顶层绑定）
import math as _math
def math_sqrt(x):
    if x < 0:
        raise ValueError("负数不能开平方")
    return _math.sqrt(x)
def math_floor(x): return _math.floor(x)
def math_ceil(x): return _math.ceil(x)
def math_sin(x): return _math.sin(x)
def math_cos(x): return _math.cos(x)
def math_tan(x): return _math.tan(x)
def math_log(x):
    if x <= 0:
        raise ValueError("log 的参数必须为正")
    return _math.log(x)
def math_log2(x):
    if x <= 0:
        raise ValueError("log2 的参数必须为正")
    return _math.log2(x)
def math_log10(x):
    if x <= 0:
        raise ValueError("log10 的参数必须为正")
    return _math.log10(x)

def list_files(path: str = ".") -> str:
    try:
        path = os.path.expanduser(path)
        files = os.listdir(path)
        result = "📁 " + os.path.abspath(path) + "\n"
        for f in sorted(files)[:50]:
            icon = "📁" if os.path.isdir(os.path.join(path, f)) else "📄"
            result += "  " + icon + " " + f + "\n"
        if len(files) > 50:
            result += "... 还有 " + str(len(files) - 50) + " 个\n"
        return result
    except Exception as e:
        return "❌ " + str(e)

def read_file(file_path: str, encoding: str = "text", max_chars: int = 5000) -> str:
    try:
        file_path = os.path.expanduser(file_path)
        if encoding == "base64":
            with open(file_path, "rb") as f:
                raw = f.read(256 * 1024)
            return base64.b64encode(raw).decode("ascii")
        try:
            max_chars = max(1, min(int(max_chars), 200000))
        except Exception:
            max_chars = 5000
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read(max_chars + 1)
        suffix = "\n..." if len(content) > max_chars else ""
        return content[:max_chars] + suffix
    except Exception as e:
        return "❌ " + str(e)

def unescape_ai_content(text: str) -> str:
    """尽量把 AI 输出的转义修复为真实字符。
    只在有明显信号时动手，避免破坏文件里合法存在的反斜杠序列：
      A) 全文没有真实换行、但充满字面 \\n → AI 把整个内容写成单行转义串
      B) 字面 \\n 数量远超真实换行（>3 且 >2倍）→ AI 混合转义
    """
    if not text:
        return text
    bs = "\\"
    newline, tab, quote = chr(10), chr(9), chr(34)
    real_nl = text.count(newline)
    lit_nl = text.count(bs + "n")
    if real_nl == 0 and lit_nl:
        text = text.replace(bs + bs + "n", newline)
        text = text.replace(bs + "n", newline).replace(bs + "t", tab).replace(bs + '"', quote)
        return text
    if lit_nl > 3 and lit_nl > real_nl * 2:
        text = text.replace(bs + bs + "n", newline)
        text = text.replace(bs + "n", newline).replace(bs + "t", tab).replace(bs + '"', quote)
    return text

def write_file(file_path: str, content: str, encoding: str = "text") -> str:
    try:
        file_path = os.path.expanduser(file_path)
        parent = os.path.dirname(file_path)
        if parent and not os.path.isdir(parent):
            os.makedirs(parent, exist_ok=True)
        if encoding == "base64":
            decoded = base64.b64decode(content, validate=True)
            with open(file_path, "wb") as f:
                f.write(decoded)
            return "✅ 已写入 " + file_path + " (base64 解码后 " + str(len(decoded)) + " 字节)"
        fixed_content = unescape_ai_content(content)
        original_newlines = content.count(chr(10))
        fixed_newlines = fixed_content.count(chr(10))
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(fixed_content)
        msg = "✅ 已写入 " + file_path + " (" + str(len(fixed_content)) + " 字符"
        if fixed_newlines > original_newlines:
            msg += ", 修复了 " + str(fixed_newlines - original_newlines) + " 个换行"
        msg += ")"
        return msg
    except Exception as e:
        return "❌ " + str(e)

def search_web(query: str, max_results: int = 5) -> str:
    """真实搜索：DuckDuckGo Lite（零依赖抓取）。需要机器能访问 duckduckgo.com。"""
    try:
        max_results = max(1, min(int(max_results), 8))
    except Exception:
        max_results = 5
    url = "https://lite.duckduckgo.com/lite/?q=" + quote(str(query))
    try:
        req = Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
            "Accept": "text/html",
        })
        with urlopen(req, timeout=15) as resp:
            page = resp.read().decode("utf-8", errors="ignore")
    except URLError as e:
        return "❌ 搜索失败（无法访问 DuckDuckGo）: " + str(e.reason)
    except Exception as e:
        return "❌ 搜索失败: " + str(e)

    items = re.findall(r'<a[^>]*class="result-link"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', page, re.S)
    snippets = re.findall(r'<td[^>]*class="result-snippet"[^>]*>(.*?)</td>', page, re.S)
    if not items:  # 兜底：抓取所有外链
        items = [(u, t) for u, t in re.findall(r'<a[^>]*href="(https?://[^"]+)"[^>]*>(.*?)</a>', page, re.S)
                 if "duckduckgo.com" not in u]
    if not items:
        return "❌ 没有解析到搜索结果（DuckDuckGo 页面结构可能变了）"

    lines = ["🔎 搜索: " + str(query)]
    for i, (link, title) in enumerate(items[:max_results]):
        link = html_unescape(link).strip()
        if "uddg=" in link:  # DDG 跳转链接 → 还原真实地址
            link = unquote(parse_qs(urlparse(link).query).get("uddg", [link])[0])
        title = strip_tags(html_unescape(title)).strip()
        snippet = strip_tags(html_unescape(snippets[i])).strip() if i < len(snippets) else ""
        lines.append("[" + str(i + 1) + "] " + title + "\n    " + link + (("\n    " + snippet) if snippet else ""))
    return "\n".join(lines)


# ========== 本地工具注册表 ==========
TOOLS = {
    "execute_terminal": {
        "func": execute_terminal,
        "description": "执行终端/shell命令（ls, cat, pwd, ps, apt, pkg, python 等）",
        "params": {
            "command": {"type": "string", "description": "要执行的命令"},
            "timeout": {"type": "integer", "description": "超时秒数（1-300）", "default": 30}
        }
    },
    "get_system_info": {
        "func": get_system_info,
        "description": "获取系统信息",
        "params": {}
    },
    "get_datetime": {
        "func": get_datetime,
        "description": "获取当前本地时间、时区偏移和 Unix 时间戳（命名文件、记日志时用）",
        "params": {}
    },
    "calc": {
        "func": calc,
        "description": "安全计算器：数学表达式求值，如 (3+5)*2、sqrt(16)、2**10（只支持数字和数学函数，无任何代码执行风险）",
        "params": {
            "expression": {"type": "string", "description": "数学表达式，如 sqrt(2)*10"}
        }
    },
    "list_files": {
        "func": list_files,
        "description": "列出目录文件",
        "params": {
            "path": {"type": "string", "description": "目录路径", "default": "."}
        }
    },
    "read_file": {
        "func": read_file,
        "description": "读取文件内容（文本，可用 encoding=base64 读二进制）",
        "params": {
            "file_path": {"type": "string", "description": "文件路径"},
            "encoding": {"type": "string", "description": "编码 text/base64", "default": "text"},
            "max_chars": {"type": "integer", "description": "最多读取字符数", "default": 5000}
        }
    },
    "write_file": {
        "func": write_file,
        "description": "写入文件（encoding=base64 可写任意二进制，自动创建父目录）",
        "params": {
            "file_path": {"type": "string", "description": "文件路径"},
            "content": {"type": "string", "description": "文件内容"},
            "encoding": {"type": "string", "description": "编码(text/base64)", "default": "text"}
        }
    },
    "search_web": {
        "func": search_web,
        "description": "真实网络搜索（DuckDuckGo），返回标题+链接+摘要",
        "params": {
            "query": {"type": "string", "description": "搜索关键词"},
            "max_results": {"type": "integer", "description": "返回条数（1-8）", "default": 5}
        }
    }
}


# ========== MCP 客户端 ==========

class MCPClient:
    """支持 stdio 和 Streamable HTTP 两种 MCP 传输。
    HTTP: POST + Accept: application/json, text/event-stream，解析 JSON 或 SSE，
          自动处理 Mcp-Session-Id，执行 initialize 握手。
    stdio: 命令行按 shlex 分词（支持引号），stderr 重定向到日志文件，
          永远不会因管道写满而死锁。
    """

    PROTOCOL_VERSION = "2024-11-05"

    def __init__(self, server_config):
        self.config = server_config
        self.proc = None
        self.stderr_log = None
        self.lock = threading.Lock()        # 保护 msg_id
        self.call_lock = threading.Lock()   # 保证一个请求的发送+读取原子性
        self.msg_id = 0
        self._connected = False
        self.session_id = None              # Streamable HTTP session
        self.log_path = None

    def _next_id(self):
        with self.lock:
            self.msg_id += 1
            return self.msg_id

    # ----- stdio -----

    def _safe_log_name(self):
        name = str(self.config.get("name", "mcp"))
        return re.sub(r"[^A-Za-z0-9_.-]+", "_", name) or "mcp"

    def _connect_stdio(self):
        cmd = str(self.config.get("command", "")).strip()
        if not cmd:
            print("  ❌ Stdio 服务器缺少 command")
            return False
        try:
            cmd_list = shlex.split(cmd)
        except ValueError as e:
            print("  ❌ 命令解析失败: " + str(e))
            return False
        if not cmd_list:
            return False
        try:
            env = dict(os.environ)
            env.update({k: str(v) for k, v in (self.config.get("env") or {}).items()})
            # stderr → 追加写日志文件，父进程永不阻塞，事后可排查
            self.log_path = os.path.join(LOGS_DIR, self._safe_log_name() + ".log")
            self.stderr_log = open(self.log_path, "ab", buffering=0)
            self.proc = subprocess.Popen(
                cmd_list,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=self.stderr_log,
                text=True,
                bufsize=1,
                env=env,
                cwd=self.config.get("cwd") or None,
            )
            init_id = self._next_id()
            init_req = {
                "jsonrpc": "2.0",
                "method": "initialize",
                "params": {
                    "protocolVersion": self.PROTOCOL_VERSION,
                    "capabilities": {},
                    "clientInfo": {"name": "ai-bridge", "version": VERSION}
                },
                "id": init_id
            }
            self._send_line(init_req)
            resp = self._read_response(init_id, timeout=15)
            if resp is None or "error" in resp:
                err = (resp or {}).get("error", "initialize 超时") if resp else "initialize 超时"
                print("  ❌ 握手失败: " + str(err) + "（stderr 日志: " + self.log_path + "）")
                return False
            self._send_line({"jsonrpc": "2.0", "method": "notifications/initialized"})
            self._connected = True
            return True
        except FileNotFoundError:
            print("  ❌ 找不到命令: " + cmd_list[0])
            return False
        except Exception as e:
            print("  ❌ Stdio 连接失败: " + str(e))
            return False

    def _send_line(self, msg):
        if self.proc and self.proc.stdin:
            line = json.dumps(msg) + "\n"
            self.proc.stdin.write(line)
            self.proc.stdin.flush()

    def _read_response(self, expect_id, timeout=30):
        if not self.proc or not self.proc.stdout:
            return None
        import select
        start = time.time()
        while time.time() - start < timeout:
            if self.proc.poll() is not None:
                return {"error": "MCP 进程已退出（exit=" + str(self.proc.returncode) +
                        "），详见日志 " + str(self.log_path)}
            ready, _, _ = select.select([self.proc.stdout], [], [], 0.5)
            if not ready:
                continue
            try:
                line = self.proc.stdout.readline()
            except Exception:
                continue
            if not line:
                return {"error": "MCP 进程关闭了 stdout"}
            try:
                data = json.loads(line)
            except Exception:
                continue  # 非 JSON-RPC 行（服务器日志混入 stdout），跳过
            if data.get("id") == expect_id:
                return data
        return None

    # ----- Streamable HTTP -----

    def _http_post(self, msg, expect_id=None, timeout=30):
        url = self.config.get("url", "")
        if not url:
            return {"error": "no url"}
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        }
        if self.session_id:
            headers["Mcp-Session-Id"] = self.session_id
        custom_headers = self.config.get("headers") or {}
        headers.update({str(k): str(v) for k, v in custom_headers.items()})
        data = json.dumps(msg).encode("utf-8")
        try:
            req = Request(url, data=data, headers=headers, method="POST")
            with urlopen(req, timeout=timeout) as resp:
                sid = resp.headers.get("Mcp-Session-Id")
                if sid:
                    self.session_id = sid
                status = getattr(resp, "status", 200)
                ctype = (resp.headers.get("Content-Type") or "").lower()
                raw = resp.read().decode("utf-8", errors="ignore")
        except Exception as e:
            hint = ""
            if "405" in str(e) or "404" in str(e):
                hint = "（服务器不支持 Streamable HTTP POST；旧版 SSE 型 MCP 服务器暂不支持，请改用 stdio）"
            return {"error": str(e) + hint}

        if status == 202:  # 通知已接受
            return {}
        # SSE 格式：event: message\ndata: {...}\n\n
        if "text/event-stream" in ctype:
            payloads = []
            for block in re.split(r"\r?\n\r?\n", raw):
                data_lines = [ln[5:].strip() for ln in block.splitlines()
                              if ln.startswith("data:")]
                if not data_lines:
                    continue
                try:
                    payloads.append(json.loads("\n".join(data_lines)))
                except Exception:
                    continue
            if expect_id is not None:
                for p in payloads:
                    if isinstance(p, dict) and p.get("id") == expect_id:
                        return p
            if payloads:
                return payloads[-1]
            return {"error": "SSE 响应中没有 JSON-RPC 消息"}
        try:
            return json.loads(raw) if raw.strip() else {}
        except Exception:
            return {"error": "无法解析响应: " + raw[:200]}

    def _connect_http(self):
        if self._connected:
            return True
        init_id = self._next_id()
        init_req = {
            "jsonrpc": "2.0",
            "method": "initialize",
            "params": {
                "protocolVersion": self.PROTOCOL_VERSION,
                "capabilities": {},
                "clientInfo": {"name": "ai-bridge", "version": VERSION}
            },
            "id": init_id
        }
        resp = self._http_post(init_req, expect_id=init_id, timeout=15)
        if not resp or "error" in resp:
            print("  ❌ HTTP MCP 握手失败: " + str((resp or {}).get("error", "无响应")))
            return False
        self._http_post({"jsonrpc": "2.0", "method": "notifications/initialized"})
        self._connected = True
        return True

    # ----- 公共 API -----

    def connect(self):
        if self._connected:
            return True
        stype = self.config.get("type", "http")
        return self._connect_stdio() if stype == "stdio" else self._connect_http()

    def is_alive(self):
        if not self._connected:
            return False
        if self.config.get("type", "http") == "stdio":
            return self.proc is not None and self.proc.poll() is None
        return True

    def request(self, method, params=None, timeout=30):
        req_id = self._next_id()
        req = {"jsonrpc": "2.0", "method": method, "id": req_id}
        if params is not None:
            req["params"] = params
        stype = self.config.get("type", "http")
        if stype == "stdio":
            with self.call_lock:
                if not self.is_alive():
                    if not self.connect():
                        return {"error": "无法连接 stdio MCP 服务器（详见 " + str(self.log_path) + "）"}
                self._send_line(req)
                return self._read_response(req_id, timeout=timeout) or {"error": "timeout"}
        with self.call_lock:
            if not self._connected:
                if not self.connect():
                    return {"error": "无法连接 HTTP MCP 服务器"}
            return self._http_post(req, expect_id=req_id, timeout=timeout)

    def list_tools(self):
        resp = self.request("tools/list")
        if not resp or "error" in resp:
            return []
        return resp.get("result", {}).get("tools", [])

    def call_tool(self, name, arguments):
        return self.request("tools/call", {"name": name, "arguments": arguments}, timeout=60)

    def list_resources(self):
        resp = self.request("resources/list")
        if not resp or "error" in resp:
            return []
        return resp.get("result", {}).get("resources", [])

    def read_resource(self, uri):
        return self.request("resources/read", {"uri": uri})

    def list_prompts(self):
        resp = self.request("prompts/list")
        if not resp or "error" in resp:
            return []
        return resp.get("result", {}).get("prompts", [])

    def get_prompt(self, name, arguments=None):
        params = {"name": name}
        if arguments:
            params["arguments"] = arguments
        return self.request("prompts/get", params)

    def close(self):
        if self.proc:
            try:
                self.proc.terminate()
                self.proc.wait(timeout=2)
            except Exception:
                try:
                    self.proc.kill()
                except Exception:
                    pass
            self.proc = None
        if self.stderr_log:
            try:
                self.stderr_log.close()
            except Exception:
                pass
            self.stderr_log = None
        self._connected = False


def mcp_response_text(resp):
    """从 MCP tools/call 响应里提取可读文本；识别 JSON-RPC 错误与非文本内容。"""
    if resp is None:
        return "MCP 无响应", True
    if "error" in resp:
        err = resp["error"]
        if isinstance(err, dict):
            return "MCP 错误 [" + str(err.get("code", "?")) + "]: " + str(err.get("message", err)), True
        return "MCP 错误: " + str(err), True
    result = resp.get("result") or {}
    is_err = bool(result.get("isError", False))
    content = result.get("content")
    if not content:
        return "(空结果)", is_err
    parts = []
    for item in content:
        if not isinstance(item, dict):
            parts.append(str(item))
            continue
        itype = item.get("type", "text")
        if itype == "text":
            parts.append(str(item.get("text", "")))
        else:
            parts.append("[" + str(itype) + " 内容]")
    return "\n".join(parts), is_err


# ========== 长连接池：stdio 服务器不必每次调用都重启 ==========

_pool = {}
_pool_lock = threading.Lock()

def get_pooled_client(server):
    key = server.get("name") or json.dumps(server, sort_keys=True, ensure_ascii=False)
    with _pool_lock:
        client = _pool.get(key)
        if client is not None and client.is_alive():
            return client
        if client is not None:
            client.close()
        client = MCPClient(server)
        if not client.connect():
            _pool.pop(key, None)
            return None
        _pool[key] = client
        return client

def drop_pooled_client(server):
    key = server.get("name") or json.dumps(server, sort_keys=True, ensure_ascii=False)
    with _pool_lock:
        client = _pool.pop(key, None)
        if client:
            client.close()

def close_pool():
    with _pool_lock:
        for client in _pool.values():
            client.close()
        _pool.clear()

atexit.register(close_pool)


# ========== 配置持久化 ==========

def load_mcp_config():
    return load_json(MCP_CONFIG_FILE, {"servers": []})

def save_mcp_config(config):
    atomic_write_json(MCP_CONFIG_FILE, config)

def load_skills():
    data = load_json(SKILLS_FILE, None)
    if data is None:
        data = {
            "skills": [
                {
                    "name": "default",
                    "description": "默认桥接助手 — 包含所有本地工具",
                    "content": build_skill_content(include_mcp=False),
                    "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            ]
        }
        save_skills(data)
    return data

def save_skills(data):
    atomic_write_json(SKILLS_FILE, data)

def load_cached_tools():
    return load_json(CACHED_TOOLS_FILE, {"tools": [], "last_fetch": ""})

def save_cached_tools(data):
    atomic_write_json(CACHED_TOOLS_FILE, data)

def cache_mcp_tools(server_name, tools):
    """把服务器工具写入缓存。同名冲突（跨服务器或与本地工具重名）自动改限定名
    server__tool，保证 AI 的每次调用都能定位到唯一工具。"""
    cached = load_cached_tools()
    existing = {}  # alias -> owner server
    for t in cached["tools"]:
        existing[t.get("alias", t.get("name"))] = t.get("_mcp_server", "")
    added, renamed, skipped = 0, [], []
    for tool in tools:
        t = dict(tool)
        orig = str(t.get("name", "")).strip()
        if not orig:
            continue
        t["_mcp_server"] = server_name
        alias = orig
        if alias in TOOLS or (alias in existing and existing[alias] != server_name):
            alias = server_name + "__" + orig
        if alias in existing and existing[alias] == server_name:
            skipped.append(orig)      # 同服务器同名，视为已缓存
            continue
        if alias in existing:         # 极端：连限定名都撞了
            skipped.append(alias)
            continue
        if alias != orig:
            renamed.append(orig + " -> " + alias)
        t["alias"] = alias
        cached["tools"].append(t)
        existing[alias] = server_name
        added += 1
    cached["last_fetch"] = time.strftime("%Y-%m-%d %H:%M:%S")
    save_cached_tools(cached)
    return added, renamed, skipped

def find_cached_tool(name):
    """按 AI 实际调用名（alias）查找缓存工具。"""
    cached = load_cached_tools()
    for t in cached.get("tools", []):
        if t.get("alias", t.get("name")) == name:
            return t
    return None


# ========== Skill 生成器 ==========

def _local_tools_section():
    tools_desc = []
    for name, meta in TOOLS.items():
        params = json.dumps(meta["params"], ensure_ascii=False, indent=2)
        tools_desc.append("\n【本地工具: " + name + "】\n描述: " + meta["description"] + "\n参数: " + params + "\n")
    return "\n".join(tools_desc)

def _mcp_tools_section():
    cached = load_cached_tools()
    mcp_tools = cached.get("tools", [])
    if not mcp_tools:
        return "（暂无缓存的 MCP 工具。请先在终端菜单 MCP 服务器配置 → 批量拉取所有服务器工具）\n"
    lines = []
    for t in mcp_tools:
        alias = t.get("alias", t.get("name"))
        desc = t.get("description", "")
        schema = t.get("inputSchema", {}) or {}
        props = schema.get("properties", {}) or {}
        required = schema.get("required", []) or []
        params = json.dumps(props, ensure_ascii=False, indent=2) if props else "{}"
        server = t.get("_mcp_server", "unknown")
        lines.append("【MCP工具: " + alias + "】 服务器: " + server)
        if alias != t.get("name"):
            lines.append("（真实工具名: " + t.get("name") + "，调用时用上面的名字即可）")
        lines.append("描述: " + desc)
        lines.append("参数: " + params)
        if required:
            lines.append("必填: " + ", ".join(required))
        lines.append("")
    return "\n".join(lines) + "\n"

def build_skill_content(include_mcp=True):
    tools_text = _local_tools_section()
    mcp_text = _mcp_tools_section() if include_mcp else "系统还连接了远程 MCP 服务器，工具列表会在重新生成 Skill 时动态写入（终端菜单 → Skill 管理 → 重新生成）。\n"
    return """=== 系统指令 ===
你是一个拥有工具调用能力的智能助手。当用户请求需要工具才能完成时，你必须使用工具，不要猜测答案。

=== 本地工具 ===
""" + tools_text + """
=== MCP 远程工具 ===
""" + mcp_text + """=== 调用格式 ===
当你需要调用工具时，在回复中插入以下 XML 块（严格遵循格式）：

<tool_call>
<tool_name>工具名称</tool_name>
<arguments>{"参数名": "参数值"}</arguments>
</tool_call>

=== 规则 ===
1. 参数必须是合法 JSON，字符串用双引号。
2. 可一次调用多个工具，每个用独立的 <tool_call> 块。
3. 输出工具调用后，系统会自动执行并把结果返回给你。
4. 你不需要模拟工具结果，等待系统返回真实结果即可。
5. 如果不需要工具，直接正常回复。
6. 绝对不要省略 <arguments> 标签！即使参数为空，也必须写 <arguments>{}</arguments>。
7. 【写入大量内容（如HTML游戏）时，使用以下格式避免 JSON 转义问题：

<tool_call>
<tool_name>write_file</tool_name>
<file_path>game.html</file_path>
<content>
<!DOCTYPE html>
<html>
... 你的内容，不用转义任何东西 ...
</html>
</content>
</tool_call>

8. 对于 execute_terminal、list_files 等普通工具，继续使用 <arguments>{"key":"value"}</arguments> 格式。
9. 【写入大文件】后端已自动修复 AI 转义错误（\\n 自动变真正换行）。如果内容特别复杂，使用 Base64 编码：

<tool_call>
<tool_name>write_file</tool_name>
<arguments>{"file_path":"game.html","encoding":"base64","content":"PCFET0NUWVBFIGh0bWw+..."}</arguments>
</tool_call>

10. 【MCP 格式】支持标准 MCP 协议调用：

<tool_call>
<tool_name>mcp</tool_name>
<arguments>{"method":"tools/call","params":{"name":"execute_terminal","arguments":{"command":"ls"}}}</arguments>
</tool_call>

11. 同名工具在不同 MCP 服务器上时，名字会以 服务器名__工具名 呈现，直接用这个名字调用即可。

=== 示例 ===
用户: "查看当前目录"
你:
<tool_call>
<tool_name>list_files</tool_name>
<arguments>{"path": "."}</arguments>
</tool_call>

用户: "执行 pwd"
你:
<tool_call>
<tool_name>execute_terminal</tool_name>
<arguments>{"command": "pwd"}</arguments>
</tool_call>
"""

def generate_default_skill():
    return build_skill_content(include_mcp=False)

def generate_full_skill():
    """生成包含 MCP 工具描述的完整 Skill"""
    return build_skill_content(include_mcp=True)

def regenerate_default_skill():
    """用最新缓存重新生成 default Skill（保留 created_at），返回提示信息。"""
    data = load_skills()
    skills = data.get("skills", [])
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    content = build_skill_content(include_mcp=True)
    existing = next((i for i, s in enumerate(skills) if s.get("name") == "default"), None)
    if existing is not None:
        skills[existing]["content"] = content
        skills[existing]["description"] = "默认桥接助手 — 本地工具 + MCP 工具（自动生成）"
        skills[existing]["updated_at"] = now
        msg = "✅ default Skill 已用最新 MCP 缓存重新生成（" + str(len(content)) + " 字符）"
    else:
        skills.append({
            "name": "default",
            "description": "默认桥接助手 — 本地工具 + MCP 工具（自动生成）",
            "content": content,
            "created_at": now,
        })
        msg = "✅ 已创建 default Skill（" + str(len(content)) + " 字符）"
    data["skills"] = skills
    save_skills(data)
    return msg


# ========== 终端 TUI ==========

def clear():
    os.system('clear' if os.name != 'nt' else 'cls')

def pause():
    input("\n按回车继续...")

def maybe_regenerate_skill():
    try:
        ans = input("\n是否根据最新缓存重新生成 default Skill？(Y/n，默认 Y): ").strip().lower()
    except EOFError:
        ans = "n"
    if ans in ("", "y", "yes"):
        print(regenerate_default_skill())

def mcp_servers_menu():
    while True:
        config = load_mcp_config()
        servers = config.get('servers', [])

        clear()
        print("=" * 55)
        print("  🔌 MCP 服务器配置")
        print("=" * 55)
        if not servers:
            print("  暂无配置，请先添加 MCP 服务器")
        else:
            for i, s in enumerate(servers):
                t = s.get('type', 'http')
                addr = s.get('url', s.get('command', 'N/A'))
                print("  [" + str(i) + "] " + s.get('name', '未命名') + " (" + t + ")")
                short = addr[:60] + '...' if len(addr) > 60 else addr
                print("      " + short)
        cached = load_cached_tools()
        print("-" * 55)
        print("  🛠️  当前缓存: " + str(len(cached.get('tools', []))) + " 个 MCP 工具" +
              (("（上次拉取 " + cached['last_fetch'] + "）") if cached.get('last_fetch') else ""))
        print("  [1] ➕ 添加 HTTP/SSE 服务器（Streamable HTTP）")
        print("  [2] ➕ 添加 Stdio 服务器")
        print("  [3] 🗑️  删除服务器")
        print("  [4] 🔗 测试连接 + 拉取工具")
        print("  [5] 🔄 批量拉取所有服务器工具")
        print("  [6] 🗑️  清空工具缓存")
        print("  [0] 返回")
        print("=" * 55)

        choice = input("选择: ").strip()
        if choice == '0':
            return
        elif choice == '1':
            name = input("名称 (如: filesystem): ").strip()
            url = input("URL (如 http://127.0.0.1:3000/mcp): ").strip()
            if name and url:
                servers.append({"name": name, "type": "http", "url": url})
                config['servers'] = servers
                save_mcp_config(config)
                print("✅ 已添加 HTTP 服务器")
                print("💡 提示: 支持 Streamable HTTP（响应 JSON 或 SSE）。如服务器需要自定义请求头，可直接编辑 " + MCP_CONFIG_FILE)
                pause()
        elif choice == '2':
            name = input("名称 (如: local-fs): ").strip()
            print("命令示例: npx -y @modelcontextprotocol/server-filesystem /tmp")
            print("💡 命令按 shell 规则分词，含空格/引号的参数请正常加引号")
            cmd = input("命令: ").strip()
            if name and cmd:
                servers.append({"name": name, "type": "stdio", "command": cmd})
                config['servers'] = servers
                save_mcp_config(config)
                print("✅ 已添加 Stdio 服务器（stderr 会写入 " + LOGS_DIR + "）")
                pause()
        elif choice == '3':
            idx = input("要删除的编号: ").strip()
            if idx.isdigit() and 0 <= int(idx) < len(servers):
                deleted = servers[int(idx)].get('name')
                del servers[int(idx)]
                config['servers'] = servers
                save_mcp_config(config)
                drop_pooled_client({"name": deleted})
                print("✅ 已删除 " + str(deleted))
                print("💡 该服务器缓存的工具仍保留在缓存中，如需清理请用 [6] 清空缓存后重新拉取")
                pause()
        elif choice == '4':
            idx = input("测试哪个编号: ").strip()
            if idx.isdigit() and 0 <= int(idx) < len(servers):
                s = servers[int(idx)]
                client = MCPClient(s)
                try:
                    print("\n正在连接 " + s.get('name') + "...")
                    if client.connect():
                        tools = client.list_tools()
                        print("✅ 连接成功！发现 " + str(len(tools)) + " 个工具")
                        for t in tools[:10]:
                            desc = (t.get('description') or '')[:40]
                            print("   • " + str(t.get('name')) + ": " + desc)
                        if len(tools) > 10:
                            print("   ... 还有 " + str(len(tools) - 10) + " 个")
                        if tools:
                            ok = input("\n是否缓存这些工具? (y/n): ").strip().lower()
                            if ok == 'y':
                                added, renamed, skipped = cache_mcp_tools(s.get('name'), tools)
                                print("✅ 已缓存 " + str(added) + " 个新工具" +
                                      (("，" + str(len(skipped)) + " 个已存在跳过") if skipped else ""))
                                for r in renamed:
                                    print("   🔀 同名冲突，已改限定名: " + r)
                                maybe_regenerate_skill()
                    else:
                        print("❌ 连接失败，请检查命令/地址是否正确，目标服务是否运行")
                except Exception as e:
                    print("❌ 错误: " + str(e))
                finally:
                    client.close()
                pause()
        elif choice == '5':
            if not servers:
                print("❌ 没有配置的服务器")
                pause()
                continue
            total = 0
            all_renamed = []
            for s in servers:
                print("\n拉取 " + s.get('name') + "...")
                client = MCPClient(s)
                try:
                    if client.connect():
                        tools = client.list_tools()
                        added, renamed, skipped = cache_mcp_tools(s.get('name'), tools)
                        total += added
                        all_renamed.extend(renamed)
                        print("  ✅ +" + str(added) + " 个工具" +
                              (("，" + str(len(skipped)) + " 个已存在跳过") if skipped else ""))
                        for r in renamed:
                            print("     🔀 " + r)
                    else:
                        print("  ❌ 连接失败")
                except Exception as e:
                    print("  ❌ 错误: " + str(e))
                finally:
                    client.close()
            print("\n🎉 共新增 " + str(total) + " 个 MCP 工具")
            if total > 0:
                maybe_regenerate_skill()
            pause()
        elif choice == '6':
            confirm = input("清空全部 MCP 工具缓存？(y/n): ").strip().lower()
            if confirm == 'y':
                save_cached_tools({"tools": [], "last_fetch": ""})
                print("✅ 已清空缓存")
                pause()


def skills_menu():
    while True:
        data = load_skills()
        skills = data.get('skills', [])

        clear()
        print("=" * 55)
        print("  📝 Skill (提示词) 管理")
        print("=" * 55)
        if not skills:
            print("  暂无 Skill")
        else:
            for i, s in enumerate(skills):
                desc = s.get('description', '')
                updated = s.get('updated_at', s.get('created_at', ''))
                print("  [" + str(i) + "] " + s['name'])
                print("      " + (desc[:50] + '...' if len(desc) > 50 else desc))
                print("      更新: " + updated)
        print("-" * 55)
        print("  [1] ➕ 创建新 Skill")
        print("  [2] ✏️  编辑 Skill")
        print("  [3] 🗑️  删除 Skill")
        print("  [4] 👁️  查看 Skill 内容")
        print("  [5] 🔄 用 MCP 缓存重新生成 default Skill")
        print("  [0] 返回")
        print("=" * 55)

        choice = input("选择: ").strip()
        if choice == '0':
            return
        elif choice == '1':
            name = input("Skill 名称 (英文/数字，无空格，如 coding): ").strip()
            if not name:
                print("❌ 名称不能为空")
                pause()
                continue
            if any(s['name'] == name for s in skills):
                print("❌ 名称已存在")
                pause()
                continue
            desc = input("描述 (如: Python 编程专家): ").strip()
            print("\n" + "-" * 55)
            print("请输入 Skill 内容（支持多行）")
            print("技巧: 直接粘贴即可，输入完按回车，再按一次回车保存")
            print("-" * 55)
            lines = []
            while True:
                try:
                    line = input()
                except EOFError:
                    break
                if line == "" and len(lines) > 0 and lines[-1] == "":
                    lines.pop()
                    break
                lines.append(line)
            content = "\n".join(lines)
            if not content.strip():
                print("❌ 内容为空，取消创建")
                pause()
                continue
            skills.append({
                "name": name,
                "description": desc or name,
                "content": content,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            })
            data['skills'] = skills
            save_skills(data)
            print("\n✅ Skill '" + name + "' 已保存 (" + str(len(content)) + " 字符)")
            pause()
        elif choice == '2':
            idx = input("编辑编号: ").strip()
            if idx.isdigit() and 0 <= int(idx) < len(skills):
                s = skills[int(idx)]
                print("\n当前: " + s['name'] + " - " + s['description'])
                print("输入新内容（多行，连续两次回车结束，输入 KEEP 保留原内容）:\n")
                lines = []
                while True:
                    try:
                        line = input()
                    except EOFError:
                        break
                    if line.strip() == "KEEP":
                        lines = None
                        break
                    if line == "" and len(lines) > 0 and lines[-1] == "":
                        lines.pop()
                        break
                    lines.append(line)
                if lines is not None:
                    new_content = "\n".join(lines)
                    if new_content.strip():
                        s['content'] = new_content
                        s['updated_at'] = time.strftime("%Y-%m-%d %H:%M:%S")
                        data['skills'] = skills
                        save_skills(data)
                        print("✅ 已更新")
                    else:
                        print("❌ 内容为空，未更新")
                else:
                    print("保留原内容")
                pause()
        elif choice == '3':
            idx = input("删除编号: ").strip()
            if idx.isdigit() and 0 <= int(idx) < len(skills):
                name = skills[int(idx)]['name']
                confirm = input("确认删除 '" + name + "'? (y/n): ").strip().lower()
                if confirm == 'y':
                    del skills[int(idx)]
                    data['skills'] = skills
                    save_skills(data)
                    print("✅ 已删除")
                pause()
        elif choice == '4':
            idx = input("查看编号: ").strip()
            if idx.isdigit() and 0 <= int(idx) < len(skills):
                s = skills[int(idx)]
                print("\n" + "=" * 55)
                print("名称: " + s['name'])
                print("描述: " + s['description'])
                print("=" * 55)
                print(s['content'])
                print("=" * 55)
                pause()
        elif choice == '5':
            print(regenerate_default_skill())
            pause()


def token_menu():
    while True:
        clear()
        print("=" * 55)
        print("  🔑 Token 管理")
        print("=" * 55)
        if AUTH_DISABLED:
            print("  ⚠️  认证已被 --no-auth / BRIDGE_NO_AUTH 关闭")
            print("=" * 55)
            pause()
            return
        tok = current_token()
        print("  当前 Token: " + (tok or "读取失败"))
        print("  Token 文件: " + TOKEN_FILE)
        print("-" * 55)
        print("  [1] 🔄 重置 Token（生成新的，旧 Token 立即失效）")
        print("  [0] 返回")
        print("=" * 55)
        choice = input("选择: ").strip()
        if choice == '0':
            return
        elif choice == '1':
            confirm = input("重置后所有已配置的客户端都需要更新 Token，确认? (y/n): ").strip().lower()
            if confirm == 'y':
                new_tok = secrets.token_hex(16)
                with open(TOKEN_FILE, "w", encoding="utf-8") as f:
                    f.write(new_tok + "\n")
                try:
                    os.chmod(TOKEN_FILE, 0o600)
                except Exception:
                    pass
                _token_cache["mtime"] = None
                _token_cache["value"] = None
                print("✅ 新 Token: " + new_tok)
                pause()


def main_menu():
    while True:
        clear()
        print("=" * 55)
        print("  🤖 AI Agent Bridge V3 — 终端配置中心")
        print("=" * 55)
        print("  📁 配置目录: " + CONFIG_DIR)

        mcp_cfg = load_mcp_config()
        skills = load_skills()
        cached = load_cached_tools()

        print("  🔐 认证: " + ("关闭 (⚠️ 不安全)" if AUTH_DISABLED else "开启 (Token)"))
        print("  🔌 MCP 服务器: " + str(len(mcp_cfg.get('servers', []))) + " 个")
        print("  🛠️  缓存工具: " + str(len(cached.get('tools', []))) + " 个 (MCP)")
        print("  📝 Skill 数量: " + str(len(skills.get('skills', []))) + " 个")
        print("-" * 55)
        print("  [1] 🔌 配置 MCP 服务器")
        print("  [2] 📝 管理 Skill")
        print("  [3] 🚀 启动桥接服务器")
        print("  [4] 🔑 查看 / 重置 Token")
        print("  [0] 退出")
        print("=" * 55)

        choice = input("选择: ").strip()
        if choice == '0':
            clear()
            print("👋 再见")
            break
        elif choice == '1':
            mcp_servers_menu()
        elif choice == '2':
            skills_menu()
        elif choice == '3':
            start_server_menu()
            return
        elif choice == '4':
            token_menu()

def start_server_menu():
    clear()
    print("=" * 55)
    print("  🚀 启动桥接服务器")
    print("=" * 55)
    host = input("Host [" + HOST + "]: ").strip() or HOST
    port_input = input("Port [" + str(PORT) + "]: ").strip()
    try:
        port = int(port_input) if port_input.strip() else PORT
    except ValueError:
        port = PORT
    print("\n即将启动: http://" + host + ":" + str(port))
    if AUTH_DISABLED:
        print("⚠️  认证已关闭：同一台机器/网络上的任何程序都能执行命令！")
    elif host not in ("127.0.0.1", "localhost", "::1"):
        print("⚠️  正在监听非回环地址，局域网内任何人持 Token 即可执行命令！")
    print("按 Ctrl+C 停止\n")
    start_server(host, port)


# ========== 本地控制面板（http 顶层导航，绕过 PNA/跨域限制）==========

PANEL_HTML = r'''<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Bridge · 本地控制面板</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
body{background:#14161b;color:#e8eaed;padding:12px;max-width:860px;margin:0 auto}
h1{font-size:19px;margin:4px 2px 12px}
h1 small{font-size:11px;color:#8ab4f8;font-weight:500;margin-left:6px}
.card{background:#1c1f26;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;margin-bottom:12px}
.label{font-size:11px;color:#bdc1c6;margin:8px 2px 4px;display:block}
input,textarea,select{width:100%;background:#101218;border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#e8eaed;font-size:13px;padding:9px 10px;outline:none}
input:focus,textarea:focus{border-color:#10a37f}
textarea{min-height:130px;resize:vertical;font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.5}
.btn{display:inline-block;background:#10a37f;border:1px solid #10a37f;color:#fff;font-size:13px;font-weight:600;border-radius:10px;padding:9px 16px;cursor:pointer}
.btn:active{transform:scale(.98)}
.btn.secondary{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.13);color:#e8eaed;font-weight:400}
.btn.block{width:100%;margin-top:10px}
.btn:disabled{opacity:.5}
.row{display:flex;gap:8px;align-items:center}
.row>.btn{flex:1}
.status{font-size:12px;color:#9aa0a6;line-height:1.6}
.status b{color:#e8eaed}
.ok{color:#34d399}.bad{color:#f87171}
.result{background:#101218;border-radius:12px;padding:10px;margin-bottom:8px;border-left:4px solid #34d399}
.result.fail{border-left-color:#f87171}
.rtool{font-family:ui-monospace,monospace;font-weight:700;font-size:12px;color:#e8eaed}
.rsame{color:#6b7280;font-size:11px;margin:4px 0;word-break:break-all}
.rtext{white-space:pre-wrap;word-break:break-all;font-size:12px;color:#c7cdd5;max-height:280px;overflow:auto;background:#0c0e12;border-radius:8px;padding:8px;margin-top:6px}
.hint{font-size:11px;color:#8a8f98;margin:6px 2px;line-height:1.6}
.big{font-size:14px;font-weight:700;color:#e8eaed}
.history-item{background:#101218;border-radius:10px;padding:8px 10px;margin-bottom:6px;font-size:11px;display:flex;gap:8px;align-items:center}
.history-item pre{flex:1;white-space:pre-wrap;word-break:break-all;color:#9aa0a6;max-height:80px;overflow:auto}
details summary{cursor:pointer;color:#8ab4f8;font-size:12px;padding:4px 2px}
details pre{font-size:11px;color:#9aa0a6;white-space:pre-wrap;word-break:break-all;max-height:220px;overflow:auto;margin-top:6px}
code{background:#0c0e12;border-radius:4px;padding:1px 5px;font-size:11px;color:#8ab4f8}
</style></head><body>

<h1>🤖 AI Bridge<small>本地控制面板 · http 同源，永不跨域</small></h1>

<div class="card status" id="status">⏳ 正在检查后端…</div>

<div class="card">
  <label class="label" for="token">Token（启动后端时终端打印的那串）</label>
  <div class="row">
    <input id="token" type="password" placeholder="例如 88947bb5b886f7734cf22f7a32b111fb" autocomplete="off" spellcheck="false">
    <button class="btn secondary" id="saveToken" style="flex:0 0 auto">💾 保存</button>
  </div>
  <div class="row" style="margin-top:8px">
    <button class="btn secondary" id="testBtn">🔌 测试连接</button>
    <button class="btn secondary" id="showTools">🛠️ 查看工具列表</button>
  </div>
  <p class="hint">💡 用法：把 AI 的<strong>完整回复</strong>（含 <code>&lt;tool_call&gt;</code> 块）整段粘进下面，点执行，再把输出<strong>整段复制回对话</strong>。危险工具（execute_terminal / write_file）执行前会二次确认。</p>
</div>

<div class="card">
  <label class="label" for="input">AI 的回复</label>
  <textarea id="input" placeholder="粘贴 AI 输出，例如：&#10;&#10;&lt;tool_call&gt;&#10;&lt;tool_name&gt;execute_terminal&lt;/tool_name&gt;&#10;&lt;arguments&gt;{&quot;command&quot;:&quot;ls -la&quot;}&lt;/arguments&gt;&#10;&lt;/tool_call&gt;"></textarea>
  <button class="btn block" id="run">🔍 解析并执行</button>
  <div id="results" style="margin-top:12px"></div>
  <button class="btn block" id="copyAll" style="display:none;background:#0d8a6a">📋 复制全部结果（粘贴回 AI 对话）</button>
</div>

<div class="card">
  <details id="toolsBox"><summary>🛠️ 工具清单（本地 + MCP）</summary><pre id="toolsList">点击上方「查看工具列表」加载…</pre></details>
</div>

<div class="card">
  <div class="big" style="margin-bottom:8px">📜 本机执行历史 <button class="btn secondary" id="clearHistory" style="float:right;padding:4px 10px;font-size:11px">清空</button></div>
  <div id="history"><div class="hint">暂无记录</div></div>
</div>

<script>
var LS_TOKEN = 'ai_bridge_panel_token';
var LS_HISTORY = 'ai_bridge_panel_history';
var tokenInput = document.getElementById('token');
var statusEl = document.getElementById('status');
var inputEl = document.getElementById('input');
var resultsEl = document.getElementById('results');
var copyAllBtn = document.getElementById('copyAll');
var lastResultsText = '';

tokenInput.value = localStorage.getItem(LS_TOKEN) || '';
document.getElementById('saveToken').onclick = function(){
  localStorage.setItem(LS_TOKEN, tokenInput.value.trim());
  flash('✅ Token 已保存', true);
  checkHealth();
};

function getToken(){ return tokenInput.value.trim(); }
function apiFetch(path, opts){
  opts = opts || {};
  var headers = { 'X-Bridge-Token': getToken() };
  if (opts.body) headers['Content-Type'] = 'application/json';
  return fetch(path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
    .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, status: r.status, data: d }; }); });
}
function flash(msg, good){
  statusEl.innerHTML = (good ? '<span class="ok">' : '<span class="bad">') + escapeHtml(msg) + '</span>';
}
function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function checkHealth(){
  statusEl.textContent = '⏳ 正在检查后端…';
  return apiFetch('/').then(function(r){
    if (!r.ok) { flash((r.data && (r.data.error || r.data.message)) || ('HTTP ' + r.status), false); return false; }
    var d = r.data;
    statusEl.innerHTML = '<span class="ok">✅ 已连接</span> · <b>V' + escapeHtml(d.version) + '</b> · 本地工具 ' + d.local_tools.length + ' 个 · MCP ' + d.mcp_tools_count + ' 个 · 认证: ' + (d.auth ? '开启' : '关闭');
    return true;
  }).catch(function(e){ flash('无法连接（' + e.message + '）——后端没跑？', false); return false; });
}
document.getElementById('testBtn').onclick = function(){ checkHealth(); };

document.getElementById('showTools').onclick = function(){
  var box = document.getElementById('toolsBox');
  box.open = true;
  var pre = document.getElementById('toolsList');
  pre.textContent = '加载中…';
  Promise.all([apiFetch('/tools'), apiFetch('/mcp')]).then(function(rs){
    var local = rs[0].ok ? rs[0].data.tools.map(function(t){ return '【本地】' + t.name + '\n       ' + t.description; }).join('\n') : '(加载失败)';
    var mcp = rs[1].ok ? (rs[1].data.result && rs[1].data.result.tools || []).map(function(t){ return '【MCP】' + t.name + '\n       ' + t.description; }).join('\n') || '（暂无缓存的 MCP 工具）' : '(加载失败)';
    pre.textContent = local + '\n\n' + mcp;
  });
};

// ---- 解析 tool_call（与 userscript 同款逻辑）----
function parseToolCalls(text){
  var matches = [], m;
  var mcpRe = /<tool_call>[\s\S]*?<tool_name>\s*mcp\s*<\/tool_name>[\s\S]*?<arguments>\s*([\s\S]*?)\s*<\/arguments>[\s\S]*?<\/tool_call>/gim;
  while ((m = mcpRe.exec(text)) !== null) {
    try { var d = JSON.parse(m[1].trim()); var p = d.params || {};
      matches.push({ toolName: p.name || d.tool_name || '', arguments: p.arguments || {} });
    } catch (e) {}
  }
  var rawRe = /<tool_call>[\s\S]*?<tool_name>\s*(.*?)\s*<\/tool_name>[\s\S]*?<file_path>\s*([\s\S]*?)\s*<\/file_path>[\s\S]*?<content>\s*([\s\S]*?)\s*<\/content>[\s\S]*?<\/tool_call>/gim;
  while ((m = rawRe.exec(text)) !== null) {
    matches.push({ toolName: m[1].trim(), arguments: { file_path: m[2].trim(), content: m[3] } });
  }
  var fixed = text.replace(/<\/tool_name>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g, '</tool_name>\n<arguments>$1</arguments>\n</tool_call>');
  var re = /<tool_call>[\s\S]*?<tool_name>\s*(.*?)\s*<\/tool_name>[\s\S]*?<arguments>\s*([\s\S]*?)\s*<\/arguments>[\s\S]*?<\/tool_call>/gim;
  while ((m = re.exec(fixed)) !== null) {
    var name = m[1].trim(); if (name.toLowerCase() === 'mcp') continue;
    var argsText = m[2].trim(), args = {};
    try { args = JSON.parse(argsText); }
    catch (e) { try { args = JSON.parse(argsText.replace(/[\x00-\x1f]+/g, ' ')); }
                catch (e1) { try { args = JSON.parse(argsText.replace(/'/g, '"')); } catch (e2) { args = { _raw: argsText, _error: 'JSON解析失败' }; } } }
    matches.push({ toolName: name, arguments: args });
  }
  var blocks = text.match(/<tool_call>[\s\S]*?<\/tool_call>/gi) || [];
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (/<tool_name>\s*mcp\s*<\/tool_name>/i.test(b) || /<file_path>/i.test(b) || /<arguments>/i.test(b)) continue;
    var nm = b.match(/<tool_name>\s*([\s\S]*?)\s*<\/tool_name>/i); if (!nm) continue;
    matches.push({ toolName: nm[1].trim(), arguments: {} });
  }
  return matches;
}

function isDangerous(n){ n = String(n).toLowerCase(); return n === 'execute_terminal' || n === 'write_file'; }
function renderResult(idx, tc, res, ok){
  var div = document.createElement('div');
  div.className = 'result' + (ok ? '' : ' fail');
  div.innerHTML = '<div class="rtool">' + (ok ? '✅' : '❌') + ' ' + escapeHtml(tc.toolName) + '</div>' +
                  '<div class="rsame">参数: ' + escapeHtml(JSON.stringify(tc.arguments)).slice(0, 300) + '</div>' +
                  '<div class="rtext">' + escapeHtml(res) + '</div>';
  resultsEl.appendChild(div);
  try { div.scrollIntoView({ block: 'nearest' }); } catch (e) {}
}

document.getElementById('run').onclick = function(){
  var text = inputEl.value;
  var calls = parseToolCalls(text);
  resultsEl.innerHTML = '';
  copyAllBtn.style.display = 'none';
  if (calls.length === 0) { resultsEl.innerHTML = '<div class="result fail"><div class="rtool">⚠️ 没有找到 &lt;tool_call&gt; 块</div></div>'; return; }
  var results = [];
  var chain = Promise.resolve();
  calls.forEach(function(tc, i){
    chain = chain.then(function(){
      if (isDangerous(tc.toolName)) {
        var preview = JSON.stringify(tc.arguments, null, 1).slice(0, 400);
        if (!confirm('⚠️ 危险操作确认\n工具: ' + tc.toolName + '\n参数:\n' + preview + '\n\n允许执行？')) {
          results.push({ tool: tc.toolName, args: tc.arguments, result: '用户拒绝了执行该操作。', success: false });
          renderResult(i, tc, '用户拒绝了执行该操作。', false);
          return;
        }
      }
      return apiFetch('/execute', { method: 'POST', body: { tool_name: tc.toolName, arguments: tc.arguments } })
        .then(function(r){
          var res = r.ok ? (r.data.result !== undefined ? String(r.data.result) : JSON.stringify(r.data))
                         : ((r.data && (r.data.error || r.data.message)) || ('HTTP ' + r.status));
          var ok = r.ok && r.data.success !== false;
          results.push({ tool: tc.toolName, args: tc.arguments, result: res, success: ok });
          renderResult(i, tc, res, ok);
        })
        .catch(function(e){
          results.push({ tool: tc.toolName, args: tc.arguments, result: '请求失败: ' + e.message, success: false });
          renderResult(i, tc, '请求失败: ' + e.message, false);
        });
    });
  });
  chain.then(function(){
    var out = '[工具执行结果]\n\n';
    results.forEach(function(r){
      out += '工具: ' + r.tool + '\n参数: ' + JSON.stringify(r.args) + '\n结果:\n' + r.result + '\n---\n';
    });
    out += '\n请基于以上结果继续回复。';
    lastResultsText = out;
    copyAllBtn.style.display = 'block';
    saveHistory(out);
  });
};

copyAllBtn.onclick = function(){ copyText(lastResultsText); };
function copyText(text){
  function ok(){ flash('📋 已复制到剪贴板，去粘贴给 AI 吧', true); }
  function fail(){ flash('复制失败——请手动选中结果复制', false); }
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(ok, fail); return; }
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); ok(); } catch (e) { fail(); }
  document.body.removeChild(ta);
}

// ---- 本机历史 ----
function getHistory(){
  try { return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); } catch (e) { return []; }
}
function saveHistory(text){
  var h = getHistory();
  h.push({ t: Date.now(), preview: text.split('\n').filter(function(x){ return x.indexOf('工具:') === 0; }).join('，'), full: text });
  if (h.length > 30) h = h.slice(-30);
  localStorage.setItem(LS_HISTORY, JSON.stringify(h));
  renderHistory();
}
function renderHistory(){
  var box = document.getElementById('history');
  var h = getHistory();
  if (!h.length) { box.innerHTML = '<div class="hint">暂无记录</div>'; return; }
  box.innerHTML = '';
  h.slice().reverse().forEach(function(item){
    var div = document.createElement('div');
    div.className = 'history-item';
    var time = new Date(item.t).toLocaleString();
    var btn = document.createElement('button');
    btn.className = 'btn secondary';
    btn.style.flex = '0 0 auto'; btn.style.padding = '6px 10px'; btn.style.fontSize = '11px';
    btn.textContent = '📋 复制';
    btn.onclick = function(){ copyText(item.full); };
    var pre = document.createElement('pre');
    pre.textContent = '[' + time + '] ' + (item.preview || '(工具结果)');
    div.appendChild(pre); div.appendChild(btn);
    box.appendChild(div);
  });
}
document.getElementById('clearHistory').onclick = function(){ localStorage.removeItem(LS_HISTORY); renderHistory(); };

renderHistory();
checkHealth();
</script>
</body></html>
'''



# ========== HTTP 处理器 ==========

class BridgeHandler(BaseHTTPRequestHandler):
    server_version = "AIBridge/" + VERSION

    def log_message(self, format, *args):
        print("[%s] %s" % (self.log_date_time_string(), format % args))

    # ----- 认证 & 响应头 -----

    def _auth_ok(self):
        if AUTH_DISABLED:
            return True
        token = current_token()
        sent = self.headers.get("X-Bridge-Token", "")
        if not token or not sent:
            return False
        return hmac.compare_digest(sent.encode("utf-8"), token.encode("utf-8"))

    def _cors_origin(self):
        settings = load_settings()
        allowed = settings.get("cors_origin", "*")
        if allowed == "*":
            return "*"
        origin = self.headers.get("Origin", "")
        if isinstance(allowed, list):
            return origin if origin in allowed else None
        return origin if origin == allowed else None

    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        origin = self._cors_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Bridge-Token")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def _send_json(self, obj, status=200):
        self._set_headers(status)
        self.wfile.write(json.dumps(obj, ensure_ascii=False).encode("utf-8"))

    def _unauthorized(self):
        self._send_json({"error": "未授权：缺少或错误的 X-Bridge-Token（Token 在启动终端打印，或 ~/.ai_bridge/token）"}, 401)

    def do_OPTIONS(self):
        self._set_headers()

    def _read_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            content_length = 0
        if content_length > 0:
            return self.rfile.read(content_length).decode("utf-8", errors="ignore")
        return ''

    # ----- GET -----

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/panel":
            html = PANEL_HTML.encode('utf-8')
            self._set_headers(200, "text/html; charset=utf-8")
            self.wfile.write(html)
            return
        if not self._auth_ok():
            return self._unauthorized()
        query = parse_qs(parsed.query)

        if path == "/" or path == "/health":
            cached = load_cached_tools()
            configured = load_mcp_config().get("servers", [])
            self._send_json({
                "status": "🌉 Bridge V3 运行中",
                "version": VERSION,
                "auth": not AUTH_DISABLED,
                "local_tools": list(TOOLS.keys()),
                "mcp_tools_count": len(cached.get("tools", [])),
                "mcp_servers_configured": len(configured),
                "endpoints": {
                    "info": "GET /",
                    "skills_list": "GET /skills",
                    "skill_get": "GET /skill?name=xxx",
                    "skill_create": "POST /skills",
                    "skill_regenerate": "POST /skills/regenerate",
                    "skill_delete": "DELETE /skills?name=xxx",
                    "mcp_tools": "GET /mcp",
                    "mcp_servers": "GET /mcp/servers",
                    "tools": "GET /tools",
                    "execute": "POST /execute",
                    "mcp_execute": "POST /mcp"
                }
            })

        elif path == "/skills":
            data = load_skills()
            skills_list = []
            for s in data.get('skills', []):
                skills_list.append({
                    "name": s['name'],
                    "description": s.get('description', ''),
                    "updated_at": s.get('updated_at', s.get('created_at', ''))
                })
            self._send_json({"skills": skills_list})

        elif path == "/skill":
            name = query.get('name', ['default'])[0]
            data = load_skills()
            skill = next((s for s in data.get('skills', []) if s['name'] == name), None)
            if skill:
                self._send_json({"skill": skill['content']})
            else:
                self._send_json({"error": "Skill not found: " + name}, 404)

        elif path == "/mcp":
            cached = load_cached_tools()
            mcp_tools = []
            for t in cached.get('tools', []):
                props = {}
                required = []
                schema = t.get('inputSchema') or {}
                for param_name, param_info in (schema.get('properties') or {}).items():
                    props[param_name] = {
                        "type": param_info.get("type", "string"),
                        "description": param_info.get("description", "")
                    }
                    if param_name in schema.get('required', []):
                        required.append(param_name)
                mcp_tools.append({
                    "name": t.get('alias', t.get('name')),
                    "description": t.get('description', ''),
                    "inputSchema": {"type": "object", "properties": props, "required": required}
                })
            self._send_json({
                "jsonrpc": "2.0",
                "result": {"tools": mcp_tools, "protocolVersion": MCPClient.PROTOCOL_VERSION},
                "id": 1
            })

        elif path == "/mcp/servers":
            config = load_mcp_config()
            servers = []
            for s in config.get('servers', []):
                servers.append({
                    "name": s.get('name'),
                    "type": s.get('type'),
                    "url": s.get('url', ''),
                    "command": s.get('command', '')
                })
            self._send_json({"servers": servers})

        elif path == "/tools":
            tools_list = []
            for k, v in TOOLS.items():
                tools_list.append({"name": k, "description": v["description"], "params": v["params"]})
            self._send_json({"tools": tools_list})

        else:
            self._send_json({"error": "Not found"}, 404)

    # ----- DELETE -----

    def do_DELETE(self):
        if not self._auth_ok():
            return self._unauthorized()
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == "/skills":
            name = query.get('name', [''])[0].strip()
            if not name:
                self._send_json({"error": "name required"}, 400)
                return
            data = load_skills()
            skills = data.get('skills', [])
            new_skills = [s for s in skills if s.get('name') != name]
            if len(new_skills) == len(skills):
                self._send_json({"error": "Skill not found: " + name}, 404)
                return
            data['skills'] = new_skills
            save_skills(data)
            self._send_json({"success": True, "message": "Skill deleted: " + name})
        else:
            self._send_json({"error": "Not found"}, 404)

    # ----- POST -----

    def _call_local_tool(self, tool_name, arguments):
        try:
            return TOOLS[tool_name]["func"](**arguments), None
        except TypeError as e:
            expected = ", ".join(TOOLS[tool_name]["params"].keys()) or "（无参数）"
            return None, "参数错误: " + str(e) + "。该工具参数: " + expected
        except Exception as e:
            return None, "执行错误: " + str(e)

    def _call_mcp_tool(self, alias, arguments):
        """解析缓存工具（含限定名），经长连接池调用；连接异常时丢弃并重试一次。"""
        tool = find_cached_tool(alias)
        if not tool:
            return None, "未知工具: " + alias, None
        server_name = tool.get("_mcp_server", "")
        config = load_mcp_config()
        server = next((s for s in config.get('servers', []) if s.get('name') == server_name), None)
        if not server:
            return None, "MCP 服务器不存在或已删除: " + server_name + "（工具: " + alias + "）", None
        orig_name = tool.get("name")
        last_err = None
        for attempt in (1, 2):
            client = get_pooled_client(server)
            if client is None:
                return None, "无法连接 MCP 服务器: " + server_name, None
            resp = client.call_tool(orig_name, arguments)
            transient = isinstance(resp, dict) and any(
                s in str(resp.get("error", "")) for s in
                ("已退出", "Broken pipe", "timeout", "timed out", "Connection", "关闭了 stdout",
                 "RemoteDisconnected", "reset", "HTTP Error", "EOF", "urlopen")
            )
            if transient and attempt == 1:
                drop_pooled_client(server)
                last_err = resp.get("error")
                continue
            text, is_err = mcp_response_text(resp)
            return text, None, is_err
        return None, "MCP 调用失败（重试后仍不通）: " + str(last_err), None

    def _execute_tool(self, tool_name, arguments):
        """统一分发本地/MCP 工具 → (result_text, error_or_None, is_error_bool)"""
        if tool_name in TOOLS:
            result, err = self._call_local_tool(tool_name, arguments)
            return result, err, (err is not None)
        if find_cached_tool(tool_name):
            return self._call_mcp_tool(tool_name, arguments)
        cached = load_cached_tools()
        known = list(TOOLS.keys()) + [t.get("alias", t.get("name")) for t in cached.get("tools", [])]
        return None, "未知工具: " + tool_name + "。可用工具: " + ", ".join(known), None

    def do_POST(self):
        if not self._auth_ok():
            return self._unauthorized()
        parsed = urlparse(self.path)
        path = parsed.path
        body = self._read_body()

        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON"}, 400)
            return

        if path in ("/execute", "/mcp"):
            # 支持 MCP JSON-RPC 格式
            if "jsonrpc" in data and "method" in data:
                method = data.get("method")
                req_id = data.get("id", 1)

                # 通知（无 id）：一律 202 式空响应
                if method.startswith("notifications/"):
                    self._send_json({"jsonrpc": "2.0", "result": {}, "id": req_id})
                    return

                if method == "initialize":
                    self._send_json({
                        "jsonrpc": "2.0",
                        "result": {
                            "protocolVersion": MCPClient.PROTOCOL_VERSION,
                            "capabilities": {"tools": {}},
                            "serverInfo": {"name": "ai-bridge", "version": VERSION}
                        },
                        "id": req_id
                    })
                    return
                if method == "ping":
                    self._send_json({"jsonrpc": "2.0", "result": {}, "id": req_id})
                    return
                if method == "tools/list":
                    cached = load_cached_tools()
                    tools = []
                    for k, v in TOOLS.items():
                        tools.append({"name": k, "description": v["description"],
                                      "inputSchema": {"type": "object", "properties": v["params"]}})
                    for t in cached.get("tools", []):
                        tools.append({"name": t.get("alias", t.get("name")),
                                      "description": t.get("description", ""),
                                      "inputSchema": t.get("inputSchema", {"type": "object", "properties": {}})})
                    self._send_json({"jsonrpc": "2.0", "result": {"tools": tools}, "id": req_id})
                    return
                if method == "tools/call":
                    params = data.get("params", {})
                    tool_name = params.get("name", "")
                    arguments = params.get("arguments", {}) or {}
                elif method == "resources/read":
                    uri = (data.get("params", {}) or {}).get("uri", "")
                    self._send_json({
                        "jsonrpc": "2.0",
                        "result": {"contents": [{"uri": uri, "mimeType": "text/plain",
                                                 "text": "resources/read 暂未实现（本桥定位为工具执行器）"}]},
                        "id": req_id
                    })
                    return
                elif method == "prompts/get":
                    self._send_json({
                        "jsonrpc": "2.0",
                        "result": {"messages": [{"role": "user", "content": {
                            "type": "text", "text": "prompts/get 暂未实现（本桥定位为工具执行器）"}}]},
                        "id": req_id
                    })
                    return
                else:
                    self._send_json({
                        "jsonrpc": "2.0",
                        "error": {"code": -32601, "message": "Method not found: " + str(method)},
                        "id": req_id
                    })
                    return
            else:
                tool_name = data.get("tool_name", "")
                arguments = data.get("arguments", {}) or {}
                req_id = 1

            # 新格式：write_file 用 file_path 和 content 直接传参
            if not arguments and tool_name == "write_file":
                fp = data.get("file_path", "")
                ct = data.get("content", "")
                if fp:
                    arguments = {"file_path": fp, "content": ct}

            is_rpc = "jsonrpc" in data
            result_text, error, is_err = self._execute_tool(tool_name, arguments)
            # 工具结果以 ❌ 开头视为失败（如搜索不可用、参数错误），方便前端/AI 判断
            tool_failed = bool(error) or (isinstance(result_text, str) and result_text.startswith("❌"))

            if is_rpc:
                text = error if error else result_text
                self._send_json({
                    "jsonrpc": "2.0",
                    "result": {"content": [{"type": "text", "text": text}],
                               "isError": tool_failed},
                    "id": req_id
                })
            else:
                if error or tool_failed:
                    self._send_json({"success": False, "result": error or result_text, "tool": tool_name})
                else:
                    self._send_json({"success": True, "result": result_text, "tool": tool_name})
            return

        elif path == "/skills":
            name = data.get("name", "").strip()
            content = data.get("content", "").strip()
            desc = data.get("description", "").strip()
            if not name or not content:
                self._send_json({"error": "name and content required"}, 400)
                return
            skills_data = load_skills()
            skills = skills_data.get('skills', [])
            now = time.strftime("%Y-%m-%d %H:%M:%S")
            existing = next((i for i, s in enumerate(skills) if s['name'] == name), None)
            if existing is not None:
                skills[existing] = {
                    "name": name,
                    "description": desc or name,
                    "content": content,
                    "created_at": skills[existing].get("created_at", now),  # 保留原始创建时间
                    "updated_at": now
                }
                msg = "Skill updated"
            else:
                skills.append({
                    "name": name,
                    "description": desc or name,
                    "content": content,
                    "created_at": now
                })
                msg = "Skill created"
            skills_data['skills'] = skills
            save_skills(skills_data)
            self._send_json({"success": True, "message": msg})
            return

        elif path == "/skills/regenerate":
            msg = regenerate_default_skill()
            self._send_json({"success": True, "message": msg})
            return

        else:
            self._send_json({"error": "Not found"}, 404)


# ========== 启动 ==========

def start_server(host, port):
    server = ThreadingHTTPServer((host, port), BridgeHandler)
    server.daemon_threads = True
    print("=" * 55)
    print("🌉 AI Agent Bridge V3 — 运行中")
    print("📡 http://" + host + ":" + str(port))
    if AUTH_DISABLED:
        print("⚠️  认证已关闭：同机任何程序都能执行命令，务必仅本机调试使用！")
    else:
        print("🔑 Token: " + (current_token() or "读取失败"))
        print("   （浏览器面板「Token」框粘贴即可；也可在 " + TOKEN_FILE + " 查看）")
    if host not in ("127.0.0.1", "localhost", "::1"):
        print("⚠️  监听非回环地址：局域网内持 Token 者可执行命令！")
    print("🔧 本地工具: " + str(list(TOOLS.keys())))
    print("💡 零依赖，Termux 原生 Python 直接跑 · PNA/CORS 已就绪")
    print("=" * 55)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 已关闭")
    finally:
        close_pool()
        server.server_close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="AI Agent Bridge V3")
    parser.add_argument("-p", "--port", type=int, default=PORT)
    parser.add_argument("--host", default=HOST)
    parser.add_argument("--server", action="store_true", help="直接启动服务器，跳过菜单")
    parser.add_argument("--no-auth", action="store_true", help="关闭 Token 认证（不推荐，仅限纯本机调试）")
    args = parser.parse_args()

    if args.no_auth:
        AUTH_DISABLED = True

    if args.server:
        start_server(args.host, args.port)
    else:
        main_menu()

