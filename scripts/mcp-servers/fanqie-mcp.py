"""MCP Server for fanqie-service — exposes publish/inventory tools via stdio."""
import asyncio
import json
import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

FANQIE_BASE = "http://127.0.0.1:5701"

BOOKS = {
    "枪与凋零之花": {"workId": 7, "bookId": "7600575059215780926", "accountId": "fanqie_52d5ff1c9614"},
    "咳血少女与前世宿敌的百合维新": {"workId": 10, "bookId": "7600933271899212862", "accountId": "fanqie_52d5ff1c9614"},
    "无纪年王国": {"workId": 1, "bookId": "7597700170565815358", "accountId": "fanqie_52d5ff1c9614"},
    "变身S级魅魔后被坏女人包围了": {"workId": 9, "bookId": "7610788958707928089", "accountId": "fanqie_1fb88c898efb"},
}


def resolve_book(title_or_id):
    if isinstance(title_or_id, int) or (isinstance(title_or_id, str) and title_or_id.isdigit()):
        wid = int(title_or_id)
        for t, b in BOOKS.items():
            if b["workId"] == wid:
                return b, t
        return None, None
    for t, b in BOOKS.items():
        if title_or_id in t:
            return b, t
    return None, None


app = Server("fanqie-mcp")


@app.list_tools()
async def list_tools():
    return [
        Tool(name="plan_next", description="查看某本书下一章发布计划",
             inputSchema={"type": "object", "properties": {"book": {"type": "string", "description": "书名或workId"}}, "required": ["book"]}),
        Tool(name="publish_next", description="发布某本书的下一章（默认dry_run）",
             inputSchema={"type": "object", "properties": {"book": {"type": "string"}, "dry_run": {"type": "boolean", "default": True}}, "required": ["book"]}),
        Tool(name="inventory_status", description="查看所有作品的库存状态",
             inputSchema={"type": "object", "properties": {}}),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict):
    async with httpx.AsyncClient(base_url=FANQIE_BASE, timeout=30) as c:
        if name == "plan_next":
            book, title = resolve_book(arguments["book"])
            if not book:
                return [TextContent(type="text", text=f"未找到书籍: {arguments['book']}")]
            r = await c.post("/publication/plan-next", json=book)
            return [TextContent(type="text", text=f"[{title}] {r.text}")]

        elif name == "publish_next":
            book, title = resolve_book(arguments["book"])
            if not book:
                return [TextContent(type="text", text=f"未找到书籍: {arguments['book']}")]
            payload = {**book, "dryRun": arguments.get("dry_run", True), "minWordCount": 1000}
            r = await c.post("/publication/publish-next-safe", json=payload)
            return [TextContent(type="text", text=f"[{title}] {r.text}")]

        elif name == "inventory_status":
            books_list = [{"workId": b["workId"], "bookId": b["bookId"], "accountId": b["accountId"]} for b in BOOKS.values()]
            r = await c.post("/publication/inventory-status", json={"books": books_list})
            return [TextContent(type="text", text=r.text)]

    return [TextContent(type="text", text=f"未知工具: {name}")]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
