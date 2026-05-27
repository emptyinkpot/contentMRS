# DataBase Gateway MCP Adapter

这是 DataBase Gateway 的 MCP 适配器。

它不直连 MySQL，也不实现通用 SQL 工具。它只把现有的 HTTP Gateway 包装成 MCP tools，让 Claude、Cursor、Codex 等 MCP 客户端可以通过自然语言调用 DataBase 已经定义好的 API。

## 为什么不直接用 MySQL MCP

通用 MySQL MCP 适合：

- 查 schema
- 查表
- 做只读 SQL inspection

DataBase Gateway MCP 适合：

- 调用 DataBase 已经定义好的业务 API
- 避免 AI 直接写 SQL
- 复用 Gateway 的认证、幂等、权限和日志
- 给 MyBlog、Mortis、n8n、Agent Runtime 提供统一工具边界

正确关系：

```text
AI / MCP Client
  -> DataBase Gateway MCP Adapter
  -> DataBase Gateway HTTP API
  -> MySQL / NocoDB-adjacent data services
```

## 工具列表

只读工具：

- `database_gateway_status`
- `database_gateway_health`
- `database_inventory_tables`
- `database_list_works`
- `database_list_chapters`
- `database_search_vocabulary`
- `database_get_creative_style_contract`
- `database_search`

写入工具：

- `database_create_work`
- `database_append_chapter`
- `database_upsert_vocabulary_item`
- `database_record_note`
- `database_record_experience`

写入工具全部调用 Gateway 的 `/writes/*` facade，不接受 raw SQL。
每个写入工具都必须由调用方提供稳定 `idempotencyKey`；MCP adapter
不会用随机值替调用方生成业务身份。

## 环境变量

```text
DATABASE_GATEWAY_URL=https://database.tengokukk.com
DATABASE_GATEWAY_API_KEY=replace-with-generated-key
DATABASE_GATEWAY_MCP_ACTOR=database-gateway-mcp
```

`DATABASE_GATEWAY_API_KEY` 是可选项。只有 Gateway 开启 `DATABASE_GATEWAY_AUTH_REQUIRED=true` 时才需要。

## 本地验证

```bash
npm install
npm run smoke
```

## MCP 启动

```bash
npm run mcp
```

MCP 客户端配置示意：

```json
{
  "mcpServers": {
    "database-gateway": {
      "command": "node",
      "args": [
        "/home/ubuntu/workspaces/DataBase/services/gateway-mcp/mcp/server.mjs"
      ],
      "env": {
        "DATABASE_GATEWAY_URL": "https://database.tengokukk.com"
      }
    }
  }
}
```
