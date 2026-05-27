# Contributing

本仓库维护个人数据基础设施的拓扑、契约、inventory 与恢复说明。

## Change Rules

- 修改前先确认改动属于 topology、inventory、schema、operation 还是 recovery。
- 不要把生产数据 dump、大文件、网盘内容、构建产物提交进仓库。
- inventory 可以刷新提交，但必须来自真实系统采集。
- schema 文档必须标明来源：MySQL live introspection、应用 migration、或人工约定。
- secrets 文档可以记录 surface、路径、用途和策略；真实 secret 值只在用户明确要求时写入指定 surface。

## Refresh Inventories

```powershell
.\scripts\inventory\refresh-inventories.ps1
```

This refreshes:

- `evidence/inventories/mysql/table-inventory.json`
- `evidence/inventories/server/path-inventory.json`

## Delivery

Use small commits by intent:

- `docs:` topology or operating docs
- `inventory:` generated inventory snapshots
- `schema:` database schema maps
- `ops:` scripts or recovery procedures

