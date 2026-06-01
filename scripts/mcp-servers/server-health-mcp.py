"""Server Health MCP - runs INSIDE AstrBot Docker container (stdio transport).
Calls host-health-api on 127.0.0.1:19999 (container uses --network host).
Does NOT use tccli directly.
"""

import asyncio
import json
import urllib.request

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

app = Server("server-health-mcp")

HOST_API = "http://127.0.0.1:19999"
TOKEN = "hh-9Xm4wPqR7vJ2nLs5"


def _fetch(path):
    req = urllib.request.Request(
        f"{HOST_API}{path}",
        headers={"X-Health-Token": TOKEN},
    )
    resp = urllib.request.urlopen(req, timeout=10)
    return json.loads(resp.read())


@app.list_tools()
async def list_tools():
    return [
        Tool(
            name="server_health",
            description="自动发现并汇报所有云服务器状态",
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict):
    if name != "server_health":
        return [TextContent(type="text", text=f"unknown tool: {name}")]

    # Step 1: get cloud inventory from host-health-api
    try:
        cloud = _fetch("/cloud")
    except Exception as e:
        return [TextContent(type="text", text=f"ERROR fetching /cloud: {e}")]

    instances = cloud.get("instances", [])
    if not instances:
        return [TextContent(type="text", text="No instances discovered.")]

    # Step 2: fetch live metrics from each instance
    parts = []
    for inst in instances:
        ip = inst.get("ip", "N/A")
        section = (
            f"## {inst.get('name', '?')} ({ip})\n"
            f"Region: {inst.get('region')} | State: {inst.get('state')}\n"
            f"Spec: {inst.get('cpu', '?')}C / {inst.get('mem_gb', '?')}GB\n"
        )
        try:
            req = urllib.request.Request(
                f"http://{ip}:19999/",
                headers={"X-Health-Token": TOKEN},
            )
            raw = urllib.request.urlopen(req, timeout=5).read()
            live = json.loads(raw)
            section += (
                f"Mem:\n{live.get('mem', 'N/A')}\n"
                f"Disk: {live.get('disk', 'N/A')}\n"
                f"Load: {live.get('load', 'N/A')}\n"
                f"Docker:\n{live.get('docker', 'N/A')}\n"
                f"RAGFlow: {live.get('ragflow', 'N/A')}\n"
            )
        except Exception:
            section += "Live metrics: unavailable\n"
        parts.append(section)

    return [TextContent(type="text", text="\n".join(parts))]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
