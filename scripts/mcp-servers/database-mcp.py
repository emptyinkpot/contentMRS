"""MCP Server for DataBase Gateway — exposes chapter/search tools via stdio."""
import asyncio
import json
import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

GATEWAY_BASE = "http://127.0.0.1:18090"

app = Server("database-mcp")


@app.list_tools()
async def list_tools():
    return [
        Tool(name="search_chapters", description="搜索某部作品的章节列表",
             inputSchema={"type": "object", "properties": {
                 "work_id": {"type": "integer", "description": "作品ID"},
                 "keyword": {"type": "string", "description": "可选关键词过滤"}
             }, "required": ["work_id"]}),
        Tool(name="get_chapter", description="获取某章的完整内容",
             inputSchema={"type": "object", "properties": {
                 "work_id": {"type": "integer"},
                 "chapter_number": {"type": "integer"}
             }, "required": ["work_id", "chapter_number"]}),
        Tool(name="vector_search", description="向量检索文学语料库",
             inputSchema={"type": "object", "properties": {
                 "query": {"type": "string", "description": "检索关键词"},
                 "limit": {"type": "integer", "default": 5}
             }, "required": ["query"]}),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict):
    async with httpx.AsyncClient(base_url=GATEWAY_BASE, timeout=30) as c:
        if name == "search_chapters":
            wid = arguments["work_id"]
            params = {"work_id": wid}
            if arguments.get("keyword"):
                params["keyword"] = arguments["keyword"]
            r = await c.get("/content/works/{}/chapters".format(wid), params=params)
            return [TextContent(type="text", text=r.text[:3000])]

        elif name == "get_chapter":
            wid = arguments["work_id"]
            cn = arguments["chapter_number"]
            r = await c.get("/content/publication/publish-chapter", params={"local_work_id": wid, "chapter_number": cn})
            return [TextContent(type="text", text=r.text[:5000])]

        elif name == "vector_search":
            q = arguments["query"]
            limit = arguments.get("limit", 5)
            r = await c.get("/search/vector", params={"q": q, "limit": limit})
            return [TextContent(type="text", text=r.text[:3000])]

    return [TextContent(type="text", text=f"未知工具: {name}")]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
