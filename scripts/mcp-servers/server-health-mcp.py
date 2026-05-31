"""MCP Server for Server Health — exposes system health monitoring via stdio."""
import asyncio
import subprocess
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

app = Server("server-health-mcp")


def run_cmd(cmd):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        return r.stdout.strip()
    except Exception as e:
        return f"ERROR: {e}"


@app.list_tools()
async def list_tools():
    return [
        Tool(
            name="server_health",
            description="获取服务器健康状态（CPU/内存/磁盘/Docker容器/关键服务）",
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "server_health":
        mem = run_cmd("free -h | head -3")
        disk = run_cmd("df -h / | tail -1")
        load = run_cmd("cat /proc/loadavg")
        docker = run_cmd("docker ps --format '{{.Names}} {{.Status}}'")
        services = run_cmd(
            "systemctl is-active contentbase database-gateway 2>/dev/null"
            " || echo 'systemd not available'"
        )
        report = (
            f"=== 内存 ===\n{mem}\n\n"
            f"=== 磁盘 ===\n{disk}\n\n"
            f"=== 负载 ===\n{load}\n\n"
            f"=== Docker 容器 ===\n{docker}\n\n"
            f"=== 服务状态 ===\n{services}"
        )
        return [TextContent(type="text", text=report)]

    return [TextContent(type="text", text=f"未知工具: {name}")]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
