# 仓库结构规范

本文件定义 `emptyinkpot/DataBase` 的正规项目结构边界。它的目的不是把仓库变小，而是防止 DataBase 在继续扩展时变成“文档、运行产物、临时状态、服务源码混在一起但没有规则”的仓库。

## 项目定位

DataBase 不是普通 database dump 仓库，也不是单一 Node 服务仓库。

它的正规定位是：

```text
Data Platform / Data Ops Monorepo
```

也就是：

- 保存数据生态的说明书和契约。
- 保存公网 DataBase Gateway 的源码和部署配置。
- 保存内部 memory / experience / MCP 相关服务的源码或说明。
- 保存 inventory、schema、catalog、项目创建规范等机器可读资产。
- 记录哪些系统是真源，哪些系统只是消费面或投影面。

## 目录分层

```text
DataBase/
├── apps/          # 可部署应用；gateway 是 DataBase HTTP API 服务
├── packages/      # SDK、schema、可复用机器契约
├── services/      # 内部服务与适配层
├── docs/          # 平台级文档，不直接作为运行服务源码
├── scripts/       # 操作员脚本和自动化入口
├── evidence/      # 当前状态快照、claims、integration queue、timeline
├── catalog/
│   ├── ecosystem/ # 跨仓库/跨系统生态关系真源
│   └── backstage/ # 从 ecosystem registry 生成的 Backstage catalog 投影
└── .github/       # GitHub 治理和 CI
```

## 源码和运行产物边界

### `gateway/src/`

`gateway/src/` 是 Gateway 的源码真源。

新增 API、修改业务逻辑、修改认证、修改数据库访问，都应该先改这里。

### `gateway/dist/`

`gateway/dist/` 是 TypeScript 编译产物。

当前暂时保留在仓库中，原因是生产目录 `/srv/database-gateway` 直接运行 `dist/index.js`，并且当前部署链还没有完全 CI/CD 化。

保留条件：

- 每次修改 `gateway/src/` 后必须运行 `npm run build`。
- 提交时必须让 `gateway/src/` 和 `gateway/dist/` 同步。
- 后续如果部署链改成生产机执行 `npm run build`，可以删除 `gateway/dist/` 并加入 `.gitignore`。

### `node_modules/`

`node_modules/` 永远不进入 Git。

远程 IDE 工作区里出现 `node_modules/` 只属于本地依赖缓存，可以随时删除并通过 `npm install` 重建。

## 文档边界

### `docs/gateway/`

平台级 Gateway 文档。

用于解释：

- 为什么要做 DataBase Gateway。
- Gateway 在 DataBase 生态里的位置。
- 外部消费者如何接入。
- RBAC、NocoDB、Directus、DreamFactory 等参考方案。
- 运维策略和长期路线。

### `gateway/docs/`

Gateway 子项目内文档。

用于解释：

- 当前 Gateway 服务如何调用。
- 当前公网 Gateway 如何部署。
- 和 `gateway/API.md`、`gateway/openapi.yaml` 直接相关的使用说明。

### 规则

如果文档描述的是“平台哲学、生态关系、路线、治理”，放在：

```text
docs/gateway/
```

如果文档描述的是“这个 Gateway 服务如何运行、如何调用、如何部署”，放在：

```text
gateway/docs/
```

## `.runtime/` 边界

`.runtime/` 当前用于记录 Agent 协作状态，包括：

- claims
- integration queue
- timeline events

它不是业务数据真源，也不是生产运行数据库。

当前允许提交的原因：

- 这是仓库级协作历史的一部分。
- 它帮助多个 Agent 理解当前谁改过什么、哪些任务完成、哪些任务待整合。

长期更正规做法：

```text
.runtime/examples/      # 可提交的示例和模板
.runtime/live/          # 不提交的实时运行态
```

后续如果协作频率提高，应把实时状态迁到数据库或专门 runtime service，不再长期写入 Git。

## `inventories/` 边界

`inventories/` 保存当前资产快照，例如：

- MySQL 表清单
- 服务器路径清单
- 本机有价值数据候选
- 仓库归档扫描结果

它们是“可再生成的快照”，不是唯一真源。

要求：

- 每个 inventory 应能追溯生成脚本或生成来源。
- 大型 dump 不放在这里。
- 敏感数据不放在这里。

## `services/` 边界

`services/` 放 DataBase 生态里的内部服务和适配层。

当前包含：

- `memory/`: DataBase Memory Service facade。
- `experience-manager/`: 经验、笔记、记忆服务实现层。
- `database-ops-mcp/`: 数据库运维和巡检 MCP。
- `qmd-adapter/`: QMD 适配层。
- `gateway-client-adapters/`: MyBlog、Mortis 等消费者的 Gateway 适配器。
- `gateway-mcp/`: MCP adapter，把现有 DataBase Gateway HTTP API 暴露成 AI tools，不直连 MySQL，不暴露 raw SQL。

当前这些服务各自有 `package.json`，但还不是统一 workspace。

长期正规化方向：

```text
package.json
pnpm-workspace.yaml
```

把 `gateway/` 和 `services/*` 纳入统一 workspace，由根目录统一执行 lint、test、build。

当前 CI 已单独验证 `gateway/` 和 `services/gateway-mcp/`。`gateway-mcp/` 的原则是复用 Gateway HTTP API，不重复实现通用 MySQL MCP。

## 配置和密钥边界

允许提交：

```text
.env.example
**/.env.example
*.schema.json
公开文档中的占位符
```

`.env.example` 是环境变量模板，必须使用占位符，不得填真实密码。`.gitignore` 必须保留 `!.env.example` 和 `!**/.env.example`，避免模板被误忽略。

禁止提交：

```text
.env
*.pem
*.key
真实密码
真实 token
真实 cookie
数据库 dump
node_modules/
```

真实凭据应记录在 `docs/storage/secrets-surfaces.md` 中，但凭据值本身只进入明确允许的 secrets surface。

## 当前已知不够正规的地方

这些不是立即故障，但需要有意识地收口。

### 1. `gateway/dist/` 被提交

这是为了当前部署链稳定暂时保留。后续 CI/CD 完整后，建议改为构建时生成。

### 2. `.runtime/` 是 live state 和历史记录混合

短期可接受；长期应拆成 examples/live 或迁到数据库。

### 3. `docs/gateway/` 和 `gateway/docs/` 容易混淆

本文件已定义边界，后续新增文档必须按边界放置。

### 4. `services/` 尚未 workspace 化

短期保持各服务独立；长期统一成 workspace。

## 下一步结构整改顺序

建议按以下顺序推进：

1. 保持 `node_modules/` 不进 Git，定期清理远程 IDE 工作区。
2. 为 `gateway/dist/` 增加 CI 检查，确保它与 `src/` 同步。当前已由 `.github/workflows/project-contracts.yml` 执行 `npm ci`、`npm run build` 和 `git diff --exit-code -- gateway/dist`。
3. 清理 `.runtime/`，把已完成 claim 标记完成或归档。
4. 整合 `docs/gateway/` 与 `gateway/docs/` 的交叉内容，避免重复真源。
5. 评估是否引入 npm/pnpm workspace 管理 `gateway/` 和 `services/*`。
