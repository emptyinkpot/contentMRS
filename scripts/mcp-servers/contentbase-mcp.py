"""MCP Server for ContentBase — exposes article generation via stdio."""
import asyncio
import json
import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

CONTENTBASE_BASE = "http://127.0.0.1:5111"
CONTENTBASE_API_KEY = "cb-k9Xm4wPqR7vJ2nLs5tYh8dFe"

app = Server("contentbase-mcp")


@app.list_tools()
async def list_tools():
    return [
        Tool(name="generate_article", description="生成一篇文章（地缘政治评论/散文）",
             inputSchema={"type": "object", "properties": {
                 "topic": {"type": "string", "description": "文章主题"},
                 "genre": {"type": "string", "default": "reality_commentary"},
                 "wordCount": {"type": "integer", "default": 4000},
                 "target": {"type": "string", "description": "写作目标/角度"}
             }, "required": ["topic"]}),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "generate_article":
        payload = {
            "topic": arguments["topic"],
            "genre": arguments.get("genre", "reality_commentary"),
            "wordCount": arguments.get("wordCount", 4000),
        }
        if arguments.get("target"):
            payload["target"] = arguments["target"]

        async with httpx.AsyncClient(timeout=300) as c:
            r = await c.post(
                f"{CONTENTBASE_BASE}/api/content/runtime/generate/article",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {CONTENTBASE_API_KEY}",
                },
            )
            if r.status_code != 200:
                return [TextContent(type="text", text=f"生成失败: HTTP {r.status_code} {r.text[:500]}")]
            data = r.json()
            if not data.get("success"):
                return [TextContent(type="text", text=f"生成失败: {data.get('error', 'unknown')}")]
            body = data.get("data", {}).get("draft", {}).get("body", "")
            chars = len(body)
            preview = body[:1500] + ("..." if chars > 1500 else "")
            return [TextContent(type="text", text=f"生成完成 ({chars}字)\n\n{preview}")]

    return [TextContent(type="text", text=f"未知工具: {name}")]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
