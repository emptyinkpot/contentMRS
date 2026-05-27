# DataBase

本仓库是个人数据系统与 AI 基础设施生态的 canonical map，用来记录数据在哪里、谁是真源、如何访问、如何备份、如何恢复，以及哪些系统只是消费面或投影面。


## 文档导航

GitHub 仓库顶部标签栏不能自定义新增 `API`、`ARCHITECTURE` 这类入口，所以本仓库把自定义文档入口集中放在这里。以后优先从这个导航进入，不要在仓库里乱翻。

| 你想看什么 | 入口 | 说明 |
| --- | --- | --- |
| 仓库总览和结构 | [README.md](./README.md) | 当前页面；解释 DataBase 是什么、目录怎么读、API 在哪里。 |
| API 总手册 | [gateway/API.md](./gateway/API.md) | DataBase Gateway 的读写接口清单、认证规则、幂等规则。 |
| OpenAPI 契约 | [apps/gateway/openapi.yaml](./apps/gateway/openapi.yaml) | 给 API 工具、SDK、外部系统读取的标准接口描述。 |
| Gateway 子项目说明 | [gateway/README.md](./gateway/README.md) | Gateway 服务自己的启动、部署、验证入口。 |
| Gateway 调用示例 | [gateway/docs/gateway/client-usage.md](./gateway/docs/gateway/client-usage.md) | curl / JS client / 写入接口示例。 |
| 公网 Gateway 规划 | [gateway/docs/gateway/public-http-gateway.md](./gateway/docs/gateway/public-http-gateway.md) | `database.tengokukk.com`、Nginx、TLS、公开访问策略。 |
| Gateway 运维手册 | [docs/gateway/database-gateway-operations.md](./docs/gateway/database-gateway-operations.md) | 生产服务、日志、故障处理、恢复流程。 |
| 写入门面设计 | [docs/gateway/database-write-facade-p0.md](./docs/gateway/database-write-facade-p0.md) | `/writes/*` 的设计背景和 P0 范围。 |
| 外部消费者契约 | [docs/gateway/external-integration-contract.md](./docs/gateway/external-integration-contract.md) | MyBlog、Mortis、其他应用如何接入 DataBase。 |
| 存储拓扑 | [STORAGE_TOPOLOGY.md](./STORAGE_TOPOLOGY.md) | MySQL、OpenList、网盘、服务器目录之间的主关系。 |
| MySQL 当前状态 | [docs/storage/mysql-current-state.md](./docs/storage/mysql-current-state.md) | 当前 MySQL 数据库、表、账号、用途说明。 |
| OpenList 与夸克网盘 | [docs/storage/openlist-and-quark.md](./docs/storage/openlist-and-quark.md) | 文件存储入口和网盘生态说明。 |
| 长期文件对象存储 | [docs/storage/long-term-file-object-storage.md](./docs/storage/long-term-file-object-storage.md) | 长期最优文件对象层：S3-compatible object truth、OpenList 投影、rclone 迁移校验、Gateway 元数据边界。 |
| 对象存储基准测试 | [docs/operations/object-storage-benchmark.md](./docs/operations/object-storage-benchmark.md) | SeaweedFS/RustFS/S3-compatible 后端的可重复 benchmark、promotion gate 和恢复证据要求。 |
| 密钥与凭据面 | [docs/storage/secrets-surfaces.md](./docs/storage/secrets-surfaces.md) | 密码、token、cookie 等放在哪里、如何使用。 |
| 服务器路径 | [docs/storage/server-runtime-paths.md](./docs/storage/server-runtime-paths.md) | 服务器上各运行目录、部署目录、缓存目录。 |
| 数据流 | [docs/storage/data-flow.md](./docs/storage/data-flow.md) | 数据从哪里来、写到哪里、谁是消费方。 |
| 作者操作库架构 | [docs/architecture/author-operating-database.md](./docs/architecture/author-operating-database.md) | DataBase 作为作者模型、内容状态、证据契约和发布身份真源的目标结构；说明 ContentBase、RAGFlow、Dify、sub2api 的边界。 |
| 统一内容系统 | [docs/architecture/canonical-content-system.md](./docs/architecture/canonical-content-system.md) | 小说、博客、文章、短视频文案、漫画、图片资产、作者模型、证据和发布记录的统一内容模型；避免按媒介拆出平行系统。 |
| Obsidian 结构化投影 | [docs/operations/obsidian-canonical-projection.md](./docs/operations/obsidian-canonical-projection.md) | Vault Markdown 仍是人类编辑文件真源；DataBase 通过 `/writes/project-obsidian-markdown` 接收结构化 canonical 投影。 |
| 文明语义写作系统 | [docs/architecture/civilization-semantic-writing-system.md](./docs/architecture/civilization-semantic-writing-system.md) | 多层语义索引、SemanticUnit、文学性检索、概念图谱、叙事位置和 ConceptualPlan 的目标架构。 |
| 证据契约 | [docs/contracts/evidence-contract.md](./docs/contracts/evidence-contract.md) | RAGFlow、Dify、ContentBase 接入时必须遵守的 EvidenceSource、EvidenceChunk、EvidenceQueryRun、EvidenceCitation、EvidencePack 结构。 |
| 项目创建规范 | [docs/contracts/project-creation-standard.md](./docs/contracts/project-creation-standard.md) | 以后新建仓库/项目时使用的统一标准。 |
| 仓库结构规范 | [docs/contracts/repository-structure.md](./docs/contracts/repository-structure.md) | 说明源码、文档、运行产物、runtime 状态、inventory 的边界。 |
| 远程工作区边界 | [docs/contracts/remote-workspace-boundary.md](./docs/contracts/remote-workspace-boundary.md) | 本机、远程 IDE、生产机的职责边界。 |
| 数据分级 | [DATA_CLASSIFICATION.md](./DATA_CLASSIFICATION.md) | public/private/secret 等数据等级。 |
| 生态地图 | [ECOSYSTEM_MAP.md](./ECOSYSTEM_MAP.md) | DataBase 与 MyBlog、Mortis、NocoDB 等系统的关系。 |
| 架构参考来源 | [ARCHITECTURE_INSPIRATIONS.md](./ARCHITECTURE_INSPIRATIONS.md) | 参考了哪些成熟项目、借鉴了什么。 |
| 成熟方案清单 | [catalog/ecosystem/cloneable-solutions.md](./catalog/ecosystem/cloneable-solutions.md) | 可以直接借鉴/复刻的成熟项目。 |
| 创作风格合同 | [gateway/API.md](./gateway/API.md) / [schemas/creative](./schemas/creative) | 小说生成、沉浸式历史叙事、词汇库和禁用词的可执行真源在 MySQL 的 `creative_style_*`、`vocabulary`、`banned_words` 表；合同类型真源在 `schemas/creative/creative-style-contract.ts`；外部机器读取入口只能是 `GET /creative/style-contract`。 |
| 内容系统合同 | [schemas/content](./schemas/content) / [gateway/sql/005_canonical_content_schema.sql](./gateway/sql/005_canonical_content_schema.sql) | `content_works`、`content_parts`、`content_blocks`、`content_assets`、`publication_targets`、`author_profiles` 等统一内容和作者模型结构。 |
| 文明语义 API | [gateway/API.md](./gateway/API.md) | `semantic_units`、`semantic_tag_taxonomy`、`semantic_unit_tags`、`semantic_relations` 的只读入口在 `GET /semantic/units`、`GET /semantic/tags`、`GET /semantic/relations`。 |
| 运行服务地址 | [docs/runtime/service-addresses.md](./docs/runtime/service-addresses.md) | 当前各服务地址和入口。 |
| 搜索与分类运行时 | [docs/runtime/search-and-classification-runtime.md](./docs/runtime/search-and-classification-runtime.md) | search_documents/search_chunks 等检索投影说明。 |
| 本地大书资料库导入 | [docs/runtime/search-and-classification-runtime.md](./docs/runtime/search-and-classification-runtime.md#local-book-corpus-import) | 将 Obsidian/OpenList 中的大书 Markdown 正规化为 DataBase-owned literature、search chunks 和 semantic material，供 ContentBase EvidencePack 检索。 |
| Memory Service | [docs/runtime/database-memory-service.md](./docs/runtime/database-memory-service.md) | DataBase Memory Service 的设计。 |
| Gateway MCP Adapter | [services/gateway-mcp/README.md](./services/gateway-mcp/README.md) | 把现有 HTTP Gateway 包装成 MCP tools，不直连 MySQL。 |
| Agent 工作流 | [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md) | claims、integration queue、timeline 使用方式。 |
| GitHub 社区入口 | [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献和修改规则。 |
| 安全入口 | [SECURITY.md](./SECURITY.md) | 安全问题、敏感信息、漏洞处理规则。 |
| 支持入口 | [SUPPORT.md](./SUPPORT.md) | 遇到问题时的支持说明。 |

公网可直接查看的 API 文档：

```text
https://database.tengokukk.com/docs/api
https://database.tengokukk.com/openapi.yaml
```

## 层次图

这条链是当前最重要的使用路径。以后凡是 AI、外部项目、自动化脚本要碰数据，优先按这条链理解。

```text
MySQL 真源
  ↓
DataBase Gateway
  ↓
DataBase Gateway MCP Adapter
  ↓
AI Client / Claude / Cursor / Codex / Mortis
```

每一层的职责：

- **MySQL 真源**：保存真正的数据记录。
- **DataBase Gateway**：定义业务 API、认证、幂等、权限、日志，不暴露原始 SQL。
- **DataBase Gateway MCP Adapter**：把 Gateway 的 HTTP API 包装成 MCP tools，方便 AI 使用。
- **AI Client**：只调用 tool 或 API，不直接碰 MySQL 凭据。

如果只记一条原则，就记这条：

```text
AI 不直接连 MySQL，先过 Gateway，再过 MCP。
```

外部产品仓库同样遵守这条边界。ContentBase、MyBlog、Mortis 等消费方不直接读取
DataBase 管理的 MySQL 表；需要创作风格、词汇、禁用词或内容记录时，通过
DataBase Gateway 或由 `apps/gateway/openapi.yaml` 生成的 client 读取。

## 三方职责边界

DataBase 是长期真相和 SDK 产出方，不是内容生成 runtime，也不是番茄平台执行器。

```text
DataBase
  owns:
    - MySQL durable truth
    - author profiles, creative contracts, vocabulary, banned words
    - canonical content, chapters, publication targets, publication records
    - Fanqie account identity and cookie/session payload records
    - DataBase Gateway API and generated SDK

  exposes:
    - HTTP Gateway: DATABASE_GATEWAY_URL
    - OpenAPI contract: apps/gateway/openapi.yaml
    - SDK package: packages/database-client
    - schema packages: packages/schemas/*
    - EvidencePack query: GET /evidence/search
    - StylePack query: GET /style/pack

  must not own:
    - article generation workflow
    - browser automation
    - Fanqie page selectors or publish clicks
    - consumer-specific shadow registries
```

ContentBase 消费 DataBase 合同来生成文章、组织 workflow、写回 trace 和验收证据。文章资料检索优先通过 `GET /evidence/search` 读取 DataBase-owned EvidencePack；这个接口会把 `search_documents` / `search_chunks` 的索引切块和 `semantic_units` 的语义资料统一投影为 `sources`、`chunks`、`citations`、`queryRun`、`screening`。句法和文风参考通过 `GET /style/pack` 读取 DataBase-owned StylePack；它只返回派生的句长、段落密度、推进方式、修辞动作、意象簇和版权边界，不返回可复写原句。EvidencePack 是事实和来源后盾，StylePack 是写法参考，二者都不是新的资料真源。`fanqie-service` 消费 DataBase 发布上下文和账号会话来执行番茄平台动作。二者都不能绕过 Gateway 直连 MySQL。

ContentBase 的 `SyntaxReviewer` 审稿证据也归 DataBase 长期拥有。消费方需要沉淀“坏因、改写动作、禁止动作、目标形态、原句和模型修订句”时，只能调用 `/writes/record-style-revision-pair` 或生成 SDK 的 `database.semantic.recordStyleRevisionPair()`。Gateway 会把样本写入既有 `semantic_units`，并打上 `style-revision-pair`、`syntax-eval-case` 等标签；`GET /style/pack` 会把这些样本作为 `revisionPairs` 投影回写作上下文。它们用于未来提示词和评估优化，不是运行时字符串替换规则，也不是受限版权作品的可复写句库。

EvidencePack 当前是 NotebookLM 风格的私有资料边界：先检索自有资料，再让 ContentBase 模型根据资料综合成文。`queryRun.provider` 会标明本次是否来自 `database.search_chunks`、`database.semantic_units`、`web.search` 和 `ragflow.retrieval`；`screening` 会记录 query 数量、选中 chunk/citation 数量和来源多样性。`includeWeb=true` 时，联网检索只能由 `DATABASE_EVIDENCE_WEB_SEARCH_URL` 指向的真实 web evidence provider 进入 DataBase Gateway；没有 provider 就应返回配置错误，不能由消费方伪造网页资料。`includeRagflow=true` 时，RAGFlow 只能作为 DataBase EvidenceProvider 后端接入，配置项是 `DATABASE_EVIDENCE_RAGFLOW_URL`、`DATABASE_EVIDENCE_RAGFLOW_API_KEY`、`DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS`，结果会被投影成同一份 EvidencePack；ContentBase 不直连 RAGFlow，也不把 RAGFlow 的数据库或工作流变成第二真源。

推荐的人类/脚本检索入口是 `POST /research/query`：一次请求可同时启用库内检索与联网（`modes: ["corpus","web"]`），并可通过 `topicId` 读取 `apps/gateway/config/topic-corpus.json` 中的默认 `sourceIds`、`defaultStyleProfileId`、`rounds`、`pressureTransitions`、`narrativePerspectiveMode` 与 `forbiddenLexiconTags`（题材 register 过滤）。题材清单只读入口是 `GET /research/topics`。`GET /creative/style-contract?protocol=...&topicId=...` 会在 Gateway 侧按 topic 过滤 preferred/banned 词库。

**topic-corpus 真源** 只有 `apps/gateway/config/topic-corpus.json`。ContentBase 侧副本由同步脚本生成，不要手改：

```powershell
cd "E:\My Project\DataBase\apps\gateway"
pnpm run sync:topic-corpus
# 或 ContentBase: cd product/novel && pnpm run sync:topic-corpus
pnpm run sync:topic-corpus -- --check   # CI：校验未漂移
```

在 `runtime.generate.article` 请求里传显式 `notebookId` / `sourceIds` 限定材料边界；`topicId` 仅用于 open corpus 词库过滤（**不**自动绑 notebook 或 writer）。文风用 `styleProfileId` / `styleQuery`。底层仍投影为同一份 EvidencePack；`GET /evidence/search` 保留给 smoke 与向后兼容。词库可用 `pnpm run import:author-lexicon`（脚本 `import-author-lexicon-from-markdown.mjs`）增量写入 `vocabulary`（先 `--dry-run` 审 SQL）。

联网 provider 默认实现位于 `apps/web-evidence-provider`（Tavily）。Gateway 配置：

```text
DATABASE_EVIDENCE_WEB_SEARCH_URL=http://127.0.0.1:19091/search
```

```powershell
cd "E:\My Project\DataBase\apps\web-evidence-provider"
pnpm install
pnpm run dev

cd "E:\My Project\DataBase\apps\gateway"
npm run smoke:research-query
```

本地大书资料库也走同一条链路。以 `兴亡的世界史全21卷` 为例，原始 Markdown/EPUB 保留在 Obsidian/OpenList 侧，DataBase 通过 `apps/gateway/scripts/import-local-book-corpus.mjs` 读取、清洗、切块并写入 `literature`、`search_documents`、`search_chunks` 和抽样 `semantic_units`。导入后 ContentBase 只会通过 `GET /evidence/search` 或生成 SDK 拿到 EvidencePack；它不会直接读取 Obsidian 文件，也不会在产品仓库里保存第二份书籍索引。

受版权保护的本地 EPUB 必须使用 `--copyrightMode restricted-style-reference`。这种模式会把原始文件作为私有 `literature` 来源留痕，但 `search_chunks` 和 StylePack 投影只保存派生的风格、句法、修辞和段落推进画像，不保存可复写原句库。当前 `金阁寺` 的受限风格 source id 是 `book_kinkakuji_restricted_style`，只允许 ContentBase 通过 `GET /style/pack` 作为句法和修辞参考使用，不能直接复写原文句子或长段落。

如果一次文章生成要明确借鉴这套书库，调用方应传 `sourceIds=book_xingwang_world_history_21`。Gateway 会把这个约束写入 `screening.sourceFilterIds`，并只从该 source 的 `search_chunks` / `semantic_units` 中召回资料。排序以正文 chunk 命中为主，章节、section、locator 作为定位信号，书名和 sourceId 只作弱信号，避免“大书题名”把目录页、书尾说明或版权性段落顶到前面。

RAGFlow 接入的完成标准不是“能创建 dataset”或“API key 能登录”，而是 `POST /api/v1/retrieval` 对配置的 dataset 返回真实 chunk。RAGFlow dataset 必须绑定可用 embedding model，并且文档已经完成解析、切块和索引；否则 DataBase Gateway 只能视为 RAGFlow EvidenceProvider 未就绪。正式检查入口是：

```powershell
cd "E:\My Project\DataBase\apps\gateway"
npm run smoke:ragflow-evidence -- --envFile "C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env" --query "新地主阶级 通道租"
```

该 smoke 会检查 RAGFlow URL、API key、dataset 可见性、dataset embedding 配置和 retrieval chunk 数量。失败时应修 RAGFlow embedding/provider 或数据集索引，不允许在 ContentBase 里做本地兜底。

当前 RAGFlow 吸收进度是“DataBase 原生接入完成，真实检索仍被 embedding provider 阻塞”：工作区不再保留 `_upstreams/ragflow` 本地镜像；DataBase Gateway 只消费官方 `/api/v1/retrieval` 契约与运行中的 RAGFlow 服务，ContentBase 不直连。`127.0.0.1:9380/api/v1/datasets` 已验证可达，`/healthz` 在当前 RAGFlow 版本返回 404，不能作为 readiness 真相。已创建的最小 dataset 已写入 Gateway secret env，dataset 可见且已尝试绑定 embedding；但非 TEI 模式下 RAGFlow 的 Builtin embedding 不能实际执行，现有 `sub2api.tengokukk.com` 也未暴露 `/v1/embeddings`。下一步必须先提供一个 RAGFlow 可真实调用的 embedding provider，再运行：

```powershell
cd "E:\My Project\DataBase\apps\gateway"
npm run prepare:ragflow-evidence -- --envFile "C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env" --embeddingModel "<model>@<provider>"
npm run smoke:ragflow-evidence -- --envFile "C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env" --query "新地主阶级 通道租"
```

`prepare:ragflow-evidence` 只负责用 RAGFlow 官方 API 准备 smoke dataset：绑定明确指定的 embedding model、上传 `apps/gateway/fixtures/ragflow-smoke-source.txt`、触发解析和 retrieval 检查。它不会默认启用 Builtin，也不会伪造 chunk。`DATABASE_EVIDENCE_RAGFLOW_EMBEDDING_MODEL` 可以保存该模型名；没有真实 provider 时应让 smoke 失败。

`GET /health` 和 `GET /health/dependencies` 会返回 `optionalDownstreams.ragflow`，用于快速区分 RAGFlow provider 是未配置、配置缺项、HTTP 可达还是 HTTP 不可达。这个字段只是运行时可达性证据；真正完成标准仍是上面的 `smoke:ragflow-evidence` 返回真实 chunk。

也可以直接调用 `GET /health/ragflow` 查看完整 readiness report。默认检查配置、HTTP、dataset 可见性和 embedding 配置；加 `?retrieval=true` 时才要求 `/api/v1/retrieval` 返回真实文本 chunk。这个入口用于诊断，不替代 ContentBase 侧 `requireRagflowEvidence=true` 的前置 smoke。

## 外部应用接入方式

外部应用只允许通过 Gateway 或 SDK 接入 DataBase：

```ts
import { createDatabaseClient } from '@emptyinkpot/database-gateway-generated-client';

const database = createDatabaseClient({
  baseUrl: process.env.DATABASE_GATEWAY_URL,
  apiKey: process.env.DATABASE_GATEWAY_API_KEY,
  actor: 'your-service-name',
});

const style = await database.creative.styleContract();
const works = await database.works.list({ limit: 50 });
```

写入必须走 `/writes/*` 幂等门面或 SDK 对应方法，并提供稳定 idempotency key。外部应用不得新建本地 JSON/registry 去保存账号、词汇、禁用词、作品绑定或发布状态；这些长期真相先进入 DataBase。

## Identity Card

```yaml
projectName: DataBase
canonicalDoc: README.md
machineReadableEntry: project.json
ecosystemMap: ECOSYSTEM_MAP.md
localSourceRoot: E:\My Project\DataBase
githubRepo: https://github.com/emptyinkpot/DataBase
visibility: private
projectType: data topology and ecosystem contract
status: active
```

它不是业务应用仓库，也不是网盘备份仓库。MySQL、OpenList、夸克网盘、服务器目录、MyBlog、Mortis 都可以引用这里的拓扑和契约，但不得把本仓库变成新的并行数据真源。

## Current Scope

- 腾讯云 CynosDB MySQL: 结构化数据真源。
- OpenList: 文件聚合与访问入口；它是 gateway / projection surface，不是文件对象本体真源。
- 夸克网盘: 大文件、素材、归档后端之一；当文件实际保存在夸克时，夸克账号存储才是该文件对象真源。
- 服务器文件系统: 运行态、部署态、临时 artifact 与远程工作区；只有被明确登记为持久存储根的路径才可作为文件对象真源。
- 长期文件对象层: 以 S3-compatible object store 作为可替换接口，SeaweedFS 是当前主候选，RustFS 是性能挑战候选，OpenList 继续只做访问投影。
- MyBlog: 内容生产与发布消费方。
- Mortis: 操作、调度与 AI runtime 消费方。
- 本机 `.codex-secrets`: 操作员本机凭据面。
- Data curation runtime: 使用可替换模型清洗、标注、整理真实入库数据。

## 仓库结构总览

这是当前仓库的工作结构。它不是单纯源码目录，而是 DataBase 数据平台的“说明书 + 契约层 + API 网关 + 自动化工具 + 运行边界记录”。下面的树状图会直接标注每个重要目录和文件的用途。

```text
DataBase/
├── README.md                              # 仓库总入口；解释 DataBase 是什么、结构如何读、API 在哪里
├── project.json                           # 机器可读的项目清单；给自动化、AI、目录系统读取
├── AGENTS.md                              # AI/Agent 进入本仓库前必须遵守的本仓库规则
├── AGENT_WORKFLOW.md                      # Agent 协作流程；说明 claim、integration queue、timeline 怎么用
├── CONTRIBUTING.md                        # 贡献和变更流程；人或 AI 修改仓库时的基本规范
├── SECURITY.md                            # 安全说明；漏洞、敏感信息、访问边界的处理入口
├── SUPPORT.md                             # 支持说明；遇到问题应看哪里、走什么渠道
├── LICENSE                                # 仓库许可协议
├── STORAGE_TOPOLOGY.md                    # 数据存储拓扑总图；说明 MySQL/OpenList/网盘/服务器之间的关系
├── ECOSYSTEM_MAP.md                       # 生态关系图；说明 MyBlog、Mortis、OpenList、NocoDB 等如何连接
├── ARCHITECTURE_INSPIRATIONS.md           # 参考架构来源；记录借鉴哪些成熟系统以及借鉴点
├── DATA_CLASSIFICATION.md                 # 数据分级规则；区分 public/private/secret 等数据等级
├── catalog-info.yaml                      # Backstage/catalog 根实体；用于项目目录和系统图谱
├── catalog/                               # 生态登记和 Backstage 投影目录
│   ├── ecosystem/                         # 生态 registry 真源；repos/runtime/supply 等 JSON/Markdown
│   └── backstage/                         # 由 ecosystem registry 生成的 Backstage catalog 实体
├── docs/                                  # 人类和 AI 阅读的主文档区
│   ├── architecture/                      # DataBase 目标架构和系统边界
│   │   └── author-operating-database.md   # 作者操作库架构；ContentBase/RAGFlow/Dify/sub2api 边界
│   │   └── civilization-semantic-writing-system.md # 文明语义写作系统；SemanticUnit、概念图谱和文学性检索
│   ├── automation/                        # 自动化系统文档
│   │   ├── n8n.md                         # n8n 在 DataBase 生态中的定位和部署说明
│   │   └── n8n-workflows.md               # n8n 工作流规划和使用方式
│   ├── contracts/                         # 契约和规范文档；用于约束项目创建、存储和远程工作区
│   │   ├── evidence-contract.md           # 证据契约；RAGFlow/Dify/ContentBase 的资料和引用边界
│   │   ├── project-creation-standard.md   # 新项目创建标准；指导以后建仓库时如何规范化
│   │   ├── project-manifest-template.md   # project.json/project manifest 模板说明
│   │   ├── remote-workspace-boundary.md   # 远程 IDE、生产机、本机镜像之间的边界规则
│   │   └── storage-contract.md            # 存储契约；定义数据真源、投影、备份、恢复边界
│   ├── gateway/                           # DataBase Gateway 的设计、运维和外部集成文档
│   │   ├── README.md                      # gateway 文档入口
│   │   ├── api-access.md                  # API 访问策略；认证、公开访问、调用边界
│   │   ├── client-usage.md                # 外部项目如何调用 Gateway 的说明
│   │   ├── consumer-adapters.md           # MyBlog/Mortis 等消费者适配层设计
│   │   ├── database-api-service-plan.md   # DataBase API 服务化路线
│   │   ├── database-gateway-operations.md # Gateway 运维手册
│   │   ├── database-gateway-p0.md         # Gateway P0 目标和验收标准
│   │   ├── database-write-facade-p0.md    # 写入 API 门面层 P0 设计
│   │   ├── directus.md                    # Directus 作为成熟参考方案的记录
│   │   ├── dreamfactory.md                # DreamFactory 作为成熟 API 生成方案的记录
│   │   ├── external-consumers.md          # 外部消费者接入规则
│   │   ├── external-integration-contract.md # 外部系统集成契约
│   │   ├── nocodb.md                      # NocoDB 在当前生态中的定位
│   │   ├── rbac-policy.md                 # 权限/RBAC 设计
│   │   └── service-accounts.md            # 服务账号、读写账号、权限边界说明
│   ├── github/                            # GitHub 仓库治理和归档计划
│   │   ├── repository-consolidation-plan.md # 仓库收敛计划
│   │   ├── archive-candidates-2026-05-10.md # 可归档仓库候选
│   │   └── archive-readiness-scan-2026-05-10.md # 归档前检查结果
│   ├── operations/                        # 运行、迁移、清洗、恢复类操作文档
│   │   ├── data-cleaning-and-labeling-runtime.md # 数据清洗和标注运行方案
│   │   ├── directus-deployment.md         # Directus 部署记录
│   │   ├── nocodb-deployment.md           # NocoDB 部署记录
│   │   ├── recovery.md                    # 恢复手册；出故障时按这里恢复
│   │   └── ...                            # 其他运行态专题文档
│   ├── reference-architecture/            # 成熟方案参考图谱；防止闭门造车
│   │   ├── datahub.md                     # DataHub 参考：元数据平台/数据目录
│   │   ├── openmetadata.md                # OpenMetadata 参考：数据治理和目录
│   │   ├── prisma.md                      # Prisma 参考：类型化数据访问层
│   │   ├── rclone-openlist-nextcloud.md   # 文件/网盘/挂载生态参考
│   │   └── ...                            # 其他参考系统
│   ├── runtime/                           # 运行时服务说明
│   │   ├── database-memory-service.md     # DataBase Memory Service 设计
│   │   ├── database-memory-service-production.md # memory service 生产化说明
│   │   ├── search-and-classification-runtime.md # 搜索和分类运行时
│   │   └── service-addresses.md           # 服务地址登记表
│   └── storage/                           # 存储生态说明
│       ├── data-flow.md                   # 数据流向图；谁写入、谁读取、谁只是投影
│       ├── mysql-current-state.md         # MySQL 当前状态、表和用途
│       ├── openlist-and-quark.md          # OpenList 与夸克网盘生态说明
│       ├── secrets-surfaces.md            # 密钥、密码、token 的存放面和使用边界
│       └── server-runtime-paths.md        # 服务器运行目录和路径说明
├── gateway/                               # 可部署的 DataBase HTTP Gateway 服务
│   ├── README.md                          # Gateway 子项目入口说明
│   ├── API.md                             # Gateway API 手册；公网 /docs/api 会返回它
│   ├── openapi.yaml                       # OpenAPI 3.1 契约；公网 /openapi.yaml 会返回它
│   ├── package.json                       # Node/TS 服务依赖和脚本定义
│   ├── package-lock.json                  # 依赖锁定文件；保证部署可复现
│   ├── tsconfig.json                      # TypeScript 编译配置
│   ├── .env.example                       # 环境变量模板；不放真实密码
│   ├── src/                               # Gateway TypeScript 源码
│   │   ├── index.ts                       # 服务启动入口；绑定端口并启动 Hono server
│   │   ├── routes.ts                      # 总路由挂载；统一 middleware 和 route 分发
│   │   ├── auth.ts                        # API key 校验中间件；由 DATABASE_GATEWAY_AUTH_REQUIRED 开关控制
│   │   ├── config.ts                      # 环境变量读取和配置装配
│   │   ├── db.ts                          # MySQL 连接池和 query helper
│   │   ├── http.ts                        # request id、访问日志、错误响应结构
│   │   ├── sensitive.ts                   # 表可见性/敏感度判断
│   │   ├── types.ts                       # Hono bindings 和依赖注入类型
│   │   ├── utils.ts                       # limit clamp、外部健康检查等通用工具
│   │   ├── routes/                        # 具体 API 路由实现
│   │   │   ├── health.ts                  # /、/health、/status、/docs/api、/openapi.yaml
│   │   │   ├── inventory.ts               # GET /inventory/tables，列出 MySQL 表清单
│   │   │   ├── content.ts                 # GET /content/works 和 /content/works/:id/chapters
│   │   │   ├── creative.ts                # GET /creative/style-contract，创作规范合同读取
│   │   │   ├── semantic.ts                # GET /semantic/*，文明语义卡片、标签、关系读取
│   │   │   ├── vocabulary.ts              # GET /vocabulary/search，词汇表搜索
│   │   │   ├── search.ts                  # GET /search，统一搜索投影查询
│   │   │   └── writes.ts                  # POST /writes/*，五个写入 API 和幂等逻辑
│   │   └── clients/                       # Gateway 客户端 SDK/示例
│   │       ├── database-gateway-client.ts # TypeScript 客户端
│   │       ├── database-gateway-client.js # Node 可直接引用的 JS 客户端
│   │       └── example.ts                 # 客户端调用示例
│   ├── dist/                              # TypeScript 编译后的运行产物；生产服务运行这里
│   │   └── compiled runtime output        # 由 npm run build 生成
│   ├── docs/                              # Gateway 子项目自己的补充文档
│   │   └── gateway/
│   │       ├── client-usage.md            # Gateway 调用示例和客户端使用说明
│   │       └── public-http-gateway.md     # 公网域名、Nginx、TLS、公开访问策略
│   ├── ops/                               # 运维配置样例
│   │   ├── database-gateway.service       # systemd 服务文件
│   │   └── nginx/database.tengokukk.com.conf # Nginx 反向代理配置
│   ├── scripts/                           # Gateway 验证脚本
│   │   └── smoke.mjs                      # smoke test；检查 health/status/auth/write boundary
│   └── sql/                               # Gateway 需要的 SQL 契约
│       ├── 001_database_gateway_mutations.sql # 写入幂等 ledger 表
│       ├── 002_write_facade_permissions.sql   # notes/experience_records 写权限授权 SQL
│       ├── 003_creative_style_registry.sql    # 创作风格合同、作者模型、词汇和禁词真源导入
│       └── 004_semantic_units.sql             # 文明语义卡片、标签、关系和晋升记录表
├── services/                              # DataBase 内部服务层；比 gateway 更偏生态内部能力
│   ├── README.md                          # services 总入口
│   ├── memory/                            # DataBase Memory Service；对外记忆服务门面
│   ├── experience-manager/                # 经验/笔记/记忆管理实现层
│   ├── database-ops-mcp/                  # 数据库巡检和运维 MCP 说明
│   ├── qmd-adapter/                       # QMD 检索/集合适配层
│   ├── gateway-client-adapters/           # MyBlog/Mortis 等项目调用 Gateway 的适配器
│   ├── gateway-mcp/                       # 把现有 DataBase Gateway HTTP API 包装成 MCP tools
│   └── openlist-adapter/                  # OpenList 外部运行时的 DataBase SDK/API 适配层
├── scripts/                               # 操作员脚本；按职责分目录
│   ├── query/                             # 查询、索引、搜索入口
│   ├── memory/                            # memory service 调用入口
│   ├── curation/                          # 数据清洗、个人笔记导入
│   ├── project/                           # 项目初始化、校验、目录同步、环境分支工具
│   ├── catalog/                           # Backstage 实体和生态目录导出
│   ├── boundary/                          # 边界检查和对外工件导出
│   ├── storage/                           # 对象存储实验与 benchmark 入口
│   ├── repo/                              # 仓库收敛检查
│   ├── inventory/                         # inventory 快照刷新
│   └── ops/                               # 存储实验附属 compose / README
├── packages/                              # 可复用包与机器契约
│   ├── database-client/                   # Gateway 生成 SDK
│   └── schemas/                           # JSON schema / TypeScript contract packages
│       ├── agent-coordination/            # claim、integration queue 等 Agent 协作 schema
│       ├── content/                       # canonical content TypeScript contracts
│       ├── creative/                      # creative contract packages
│       ├── data-curation/                 # 数据清洗/标签 schema
│       ├── project/                       # 项目 manifest、模板 catalog schema
│       ├── search/                        # 搜索索引策略 schema
│       └── semantic/                      # 语义契约包
├── evidence/                              # 证据、inventory、claims、日志
│   ├── claims/                            # 谁正在改什么、负责什么区域
│   ├── integration-queue/                 # 等待整合的事项
│   ├── inventories/                       # 当前资产快照；通常由脚本生成
│   └── timeline/events.jsonl              # 事件时间线
└── .github/                               # GitHub 社区健康和 CI 配置
    ├── CODEOWNERS                         # 文件所有权/审查责任
    ├── PULL_REQUEST_TEMPLATE.md           # PR 模板
    ├── ISSUE_TEMPLATE/                    # Issue 模板
    └── workflows/project-contracts.yml    # 项目契约检查 CI
```

## 目录职责说明

| 路径 | 中文职责 | 说明 |
| --- | --- | --- |
| `apps/gateway/` | 公网 HTTP API 服务 | `https://database.tengokukk.com` 的源码、文档、SQL、运维配置都在这里。 |
| `apps/gateway/src/routes/` | API 路由实现 | 每个文件对应一组真实 HTTP API；写入接口在 `writes.ts`。 |
| `apps/gateway/API.md` | API 总手册 | 公网 `https://database.tengokukk.com/docs/api` 直接返回这个文件。 |
| `apps/gateway/openapi.yaml` | OpenAPI 契约 | 给外部系统、SDK、API 工具读取的标准接口描述。 |
| `packages/database-client` | 生成客户端 SDK | 从 `apps/gateway/openapi.yaml` 生成，供 ContentBase 等消费方通过 file dependency 使用；不是新的真源。 |
| `apps/gateway/sql/` | Gateway 数据库契约 | 幂等 ledger 表和写权限授权 SQL。 |
| `apps/gateway/ops/` | 生产运维配置 | systemd 和 Nginx 配置样例，帮助恢复部署。 |
| `docs/storage/` | 存储生态说明 | MySQL、OpenList、夸克网盘、服务器路径、密钥面的关系。 |
| `docs/architecture/` | 目标架构说明 | 作者操作库、写作系统链路、外部工具边界和下一阶段结构里程碑。 |
| `docs/gateway/` | Gateway 设计和运维文档 | 解释为什么这么设计、如何接入、如何运维、如何参考成熟方案。 |
| `docs/contracts/` | 规则和契约 | 项目创建规范、远程工作区边界、存储契约。 |
| `docs/runtime/` | 运行时服务说明 | 记忆服务、搜索分类运行时、服务地址。 |
| `docs/reference-architecture/` | 成熟方案参考 | 记录 DataHub、OpenMetadata、Prisma 等成熟项目的借鉴点。 |
| `services/` | 内部服务层 | memory、experience-manager、MCP、QMD adapter、client adapters、openlist-adapter。 |
| `scripts/` | 操作脚本 | 已按 query、memory、curation、project、catalog、boundary、storage、repo、inventory 分目录。 |
| `packages/schemas/` | 机器可读规范 | 给 CI、AI、脚本读取的 schema 与 TypeScript 契约包。 |
| `evidence/inventories/` | 资产快照 | MySQL 表、服务器路径、本机候选数据等 inventory。 |
| `catalog/ecosystem/` | 生态图谱 | 仓库、运行面、上下游、可借鉴方案。 |
| `evidence/` | Agent 协作和证据 | claims、integration queue、timeline、inventories、日志；用于协作与验证，不是业务表真源。 |
| `catalog/ecosystem/` | 生态登记真源 | 仓库、运行面、供应关系、上游关系等 registry。 |
| `catalog/backstage/` | 项目目录投影 | 从 `catalog/ecosystem/repos.json` 生成的 Backstage 系统/组件/域/仓库实体。 |
| `.github/` | GitHub 治理面 | CODEOWNERS、PR/Issue 模板、CI workflow。 |

## DataBase Gateway API 位置

可部署 API 位于 `apps/gateway/`。公网运行地址：

```text
https://database.tengokukk.com
```

公网说明书：

```text
https://database.tengokukk.com/docs/api
https://database.tengokukk.com/openapi.yaml
```

API 源码位置：

```text
gateway/src/routes/health.ts       # /、/health、/status、/docs/api、/openapi.yaml
gateway/src/routes/inventory.ts    # GET /inventory/tables
gateway/src/routes/content.ts      # GET /content/works、GET /content/works/:id/chapters
gateway/src/routes/creative.ts     # GET /creative/style-contract
gateway/src/routes/semantic.ts     # GET /semantic/units、GET /semantic/tags、GET /semantic/relations
gateway/src/routes/vocabulary.ts   # GET /vocabulary/search
gateway/src/routes/search.ts       # GET /search
gateway/src/routes/writes.ts       # POST /writes/*，五个写入接口和幂等逻辑
gateway/src/routes.ts              # 总路由挂载和 middleware 顺序
```

## ContentAdmin / ContentBase Consumption Boundary

`E:\My Project\ContentAdmin` is the human-facing Directus/workbench layer and
`E:\My Project\ContentBase` is the generation/runtime layer. DataBase remains
the canonical owner for source materials, EvidencePack, StylePack, semantic
units, canonical content, and controlled write facades.

```text
ContentAdmin
  -> Directus endpoint
  -> ContentAdmin SDK adapter
  -> DataBase Gateway

ContentBase
  -> DataBase generated SDK / Gateway
  -> EvidencePack / StylePack / write facades
```

ContentAdmin may display DataBase projections such as source catalog and
EvidencePack, then trigger ContentBase runtime jobs through its own SDK adapter.
It must not read MySQL tables, OpenList paths, or Obsidian files directly, and
it must not write canonical content except through Gateway write contracts.

The minimal read path now expected by ContentAdmin is:

```text
GET /content/sources
GET /evidence/search
```

The next write path should remain a DataBase-owned facade, not a Directus table
write:

```text
editor surface
  -> ContentAdmin SDK adapter
  -> DataBase Gateway /writes/*
  -> canonical content storage
```

当前读接口：

```text
GET /
GET /health
GET /status
GET /docs/api
GET /openapi.yaml
GET /inventory/tables
GET /content/works
GET /content/works/:id/chapters
GET /creative/style-contract
GET /semantic/units
GET /semantic/tags
GET /semantic/relations
GET /vocabulary/search
GET /search
```

当前写接口：

```text
POST /writes/create-work
POST /writes/append-chapter
POST /writes/upsert-vocabulary-item
POST /writes/record-note
POST /writes/record-experience
```

认证规则：

```text
DATABASE_GATEWAY_AUTH_REQUIRED=false
```

当前生产默认不需要 API key。若设置为 `true`，数据路由需要：

```text
X-DataBase-Api-Key: <key>
```

写接口无论是否开启 API key，都必须带幂等键：

```text
X-DataBase-Idempotency-Key: <stable unique key>
```

## 真源与运行边界

源码真源：

```text
GitHub: emptyinkpot/DataBase
远程 IDE 真源: server-170:/home/ubuntu/workspaces/DataBase
```

生产运行面：

```text
server-124:/srv/database-gateway
systemd: database-gateway.service
loopback: 127.0.0.1:18090
public: https://database.tengokukk.com
```

硬性规则：

```text
不要把 /srv/database-gateway 当成 canonical repo。
它只是生产运行副本。
源码修改必须进入 /home/ubuntu/workspaces/DataBase/gateway，并推送到 GitHub。
```
## Callable Data Curation

本仓库允许存储真实数据，不是只保存索引。知识数据、笔记、文档、账号、密码、cookie 等应按数据域进入对应表；清洗和标注结果作为 annotation 存储，不覆盖原始数据。

当前可调用入口：

```powershell
.\scripts\curation\curate-knowledge-items.ps1 -Limit 10
.\scripts\curation\curate-knowledge-items.ps1 -Limit 10 -Apply
```

默认模型网关：

```powershell
$env:DATA_CURATION_OPENAI_BASE_URL = "https://sub2api.tengokukk.com/v1"
$env:DATA_CURATION_OPENAI_API_KEY = "<sub2api-issued-key>"
$env:DATA_CURATION_MODEL = "glm-4-flash"
```

模型可替换；只要 sub2api 暴露 OpenAI-compatible `/v1/chat/completions`，就可以切换。Codex 负责脚本、schema、检查和故障分析；批量语义清洗默认交给 sub2api 后面的 GLM 或其他便宜模型。

详细规范见：

- `docs/operations/data-cleaning-and-labeling-runtime.md`
- `docs/operations/sub2api-data-curation-consumer.md`
- `schemas/data-curation/knowledge-label.schema.json`

## Callable Search Runtime

统一查询入口：

```powershell
.\scripts\query\database-query.ps1 status
.\scripts\query\database-query.ps1 search -Query "fl studio" -Limit 5
.\scripts\query\database-query.ps1 rebuild-index -Limit 20
.\scripts\query\database-query.ps1 rebuild-index -Limit 20 -Apply
.\scripts\query\database-query.ps1 curate -Limit 20
```

当前 P1 状态：

- MySQL 是真源。
- `search_documents` / `search_chunks` / `search_index_jobs` 是可重建检索投影。
- Meilisearch / Qdrant 是下一阶段外部检索投影候选，不是真源。
- 通用搜索默认只允许 `public` / `private`，不把 `secret` 推入通用索引。

详细规范见：

- `docs/runtime/search-and-classification-runtime.md`
- `docs/runtime/service-addresses.md`
- `schemas/search/index-policy.json`

## Project Creation Standard

New projects should start from the shared creation standard and scaffold
command:

```text
docs/contracts/project-creation-standard.md
docs/contracts/project-type-templates.md
docs/contracts/project-manifest-template.md
docs/contracts/project-directory-table.md
docs/contracts/backstage-mapping.md
docs/contracts/backstage-catalog-export.md
docs/contracts/backstage-relationships.md
docs/contracts/backstage-relation-mapping.md
docs/contracts/project-contract-pipeline.md
docs/contracts/remote-workspace-boundary.md
scripts/project/init-project.ps1
scripts/project/check-project-standard.ps1
scripts/project/sync-project-directory.ps1
scripts/catalog/export-backstage-entity.ps1
scripts/catalog/export-backstage-catalog.ps1
```

## Source Of Truth Rules

- 结构化业务数据以云端 MySQL 为真源。
- 文件对象以实际持久化后端为真源，包括夸克网盘、明确登记的服务器文件根、以及其他 OpenList 挂载后端。
- OpenList 是统一访问入口和投影视图，不等于文件对象本体真源；判断文件真源时必须落到具体 mounted backend。
- 长期新增文件对象能力必须优先复用 S3-compatible object store；DataBase Gateway 只保存对象元数据、引用和策略，不承载大文件字节。
- GitHub 仓库保存 schema、inventory、拓扑、操作规范和恢复说明，不保存全量生产数据。
- 服务器运行目录必须区分 source、deploy output、runtime cache、workspace artifact。
- 密码、token、cookie 等 credential surface 必须显式登记存放位置和用途。

## Internal Service Layers

DataBase now owns the ecosystem contract layer for memory and retrieval services:

- `services/memory/`: public `DataBase Memory Service` facade for external consumers.
- `services/experience-manager/`: internal implementation for durable memory write, recall, notes, and QMD mirror refresh.
- `services/database-ops-mcp/`: database inspection and operational context; source split is registered in `my-project-database-ops-mcp`.
- `services/qmd-adapter/`: internal QMD collection/index policy and adapter surface; QMD engine source stays in `my-project-qmd`.

External consumers should use `DataBase Memory Service` rather than hard-coding `experience-manager`, `qmd-adapter`, or QMD collection paths.

Unified local entrypoint:

```powershell
.\scripts\memory\database-memory.ps1 status
.\scripts\memory\database-memory.ps1 recall -Query "Token Pool streamLifecycle" -Limit 2
```

QMD upstream tracking is split deliberately:

- `emptyinkpot/qmd` is the GitHub-recognized fork of `tobi/qmd`.
- `emptyinkpot/my-project-qmd` is the private ecosystem runtime/source repo.
- DataBase records which one to use for runtime, upstream sync, and future memory ingestion.

## Read Order

1. `STORAGE_TOPOLOGY.md`
2. `ECOSYSTEM_MAP.md`
3. `ARCHITECTURE_INSPIRATIONS.md`
4. `docs/storage/mysql-current-state.md`
5. `docs/storage/openlist-and-quark.md`
6. `docs/storage/long-term-file-object-storage.md`
7. `docs/operations/object-storage-benchmark.md`
8. `docs/storage/server-runtime-paths.md`
9. `docs/storage/secrets-surfaces.md`
10. `docs/storage/data-flow.md`
11. `docs/architecture/author-operating-database.md`
12. `docs/architecture/civilization-semantic-writing-system.md`
13. `docs/contracts/evidence-contract.md`
14. `docs/gateway/README.md`
15. `docs/gateway/dreamfactory.md`
16. `docs/gateway/database-api-service-plan.md`
17. `docs/gateway/database-gateway-p0.md`
18. `docs/gateway/database-gateway-operations.md`
19. `docs/automation/n8n.md`
20. `docs/automation/n8n-workflows.md`
21. `docs/operations/qmd-upstream-sync.md`
22. `docs/operations/mature-component-rollout.md`
23. `docs/operations/component-placement-map.md`
24. `docs/runtime/database-memory-service.md`
25. `services/README.md`
26. `services/memory/README.md`
27. `docs/github/repository-consolidation-plan.md`
28. `docs/github/archive-candidates-2026-05-10.md`
29. `docs/github/archive-readiness-scan-2026-05-10.md`
30. `catalog/ecosystem/cloneable-solutions.md`
31. `catalog/ecosystem/cloneable-solutions.json`
32. `inventories/`

## Repository Role

This repository is an infrastructure knowledge base and contract layer. It should answer:

- What data exists?
- Where is it stored?
- Which system owns it?
- Which systems consume it?
- How can it be inspected?
- How can it be backed up and restored?
- What must not be deleted?
