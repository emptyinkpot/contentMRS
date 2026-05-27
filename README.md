# ContentMRS

ContentMRS 是一个**被 AI agent 调用的生成引擎**。它不是面向人的交互界面——人与 AI（如 Codex、Claude）对话，AI 决定何时调用 ContentMRS 生成内容。

```text
用户 ↔ AI Agent（对话、讨论、决策）
             │
             │ 确定了要写什么之后
             ▼
        ContentMRS API（生成引擎）
             │
             ▼
           成品
```

ContentMRS 接受软参数（topic、方向性描述、体裁暗示、长度期望），返回带有个人风格烙印的成品。
理解用户意图的是 AI Agent，不是 ContentMRS。ContentMRS 只负责出活。

## 唯一目标

```text
为单一 Writer 准备高密度、高价值上下文，然后生成并保存正文。
```

## 驱动问题

```text
上下文弱 -> 正文弱
```

所有功能只问一句：

```text
它能不能显著提高上下文质量？
```

不能，就不做。

## Runtime Core

真正运行主干只有：

```text
Corpus
  -> Retrieval
  -> Composition
  -> Writer
```

不得再加长。

| 层 | 只负责 | 不负责 |
|---|---|---|
| Corpus | 持久材料和临时现实材料 | 编排、写作、审稿 |
| Retrieval | 召回、扩展、重排候选材料 | 写正文 |
| Composition | 排序、预算、压缩、打包、软压力 | 二次写作 |
| Writer | 一次生成正文 | 审稿、修复、重写 |

## 四层边界

| Layer | 内部组成 | 回答的问题 |
|---|---|---|
| Corpus Layer | Reality / Literary / Semantic / Lexicon / Structure / Author | 系统拥有什么材料？ |
| Retrieval Layer | Query Planning / Hybrid Retrieval / Parent Expansion / Diversity | 当前 topic 应该取什么材料？ |
| Composition Layer | Ordering / Budgeting / Packing / Soft Pressure | 如何构造 Writer 所处的语言宇宙？ |
| Writer Layer | Single Writer / Store / Audit | 如何一次生成并保存？ |

所有 pressure 在工程上统一归入：

```text
Composition Soft Pressure
```

不要拆成 Semantic Pressure、Linguistic Pressure、Symbolic Pressure、Sentence Pressure、Context Pressure 等多套 runtime。

## 概念层防膨胀

当前最大风险不是 runtime 过度工程化，而是概念层自我繁殖。

禁止每出现一个现象就新增：

- pressure
- layer
- metadata
- topology
- pseudo ontology

边界：

```text
增厚 corpus。
不要增厚 ontology。
```

原则：

```text
少 metadata
强 retrieval
强 composition
弱规则
```

低边际项默认降级为 audit / analytics，不进入 runtime 主权重：

| 项 | 处理方式 |
|---|---|
| symbolic_gravity | audit / analytics |
| sentence_pressure | 概念可保留，不作为 runtime 主权重 |
| cadence_entropy | audit only |
| punctuation_entropy | audit only |
| clause_pattern_repetition | audit only |
| rhetorical scoring | 不做 runtime scoring |
| symbolic scoring | 不做 runtime scoring |
| sentence-level optimizer | 不做 |

## Corpus

Corpus 是系统的材料世界，不是逻辑树。

| Corpus | 定位 | 内容 | can_support_fact |
|---|---|---|---:|
| Reality | 世界边界 | 新闻、数据、时间、主体、行业、地缘、市场 | true |
| Literary | 气味系统 | 意象、节奏、句法、温度、观察方式 | false |
| Semantic | prompt dissolution | tone、rhetoric、motif、movement、psychology、historical stance | false |
| Lexicon | 表达燃料 | 词汇、短语、连接词、专业术语、时代语境词 | false |
| Structure | 文章运动轨迹 | 开头、推进、转折、收束 | false |
| Author | 长期个人偏好 | 历史文章、常用结构、温度、观察方式 | false |

核心边界：

```text
现实材料决定世界边界。
文学材料决定语境气味。
Reality constrains imagination.
```

Author 必须最弱，不能压过 Reality。

## 资料存储边界

不是所有东西都进 DataBase。

| 材料 | 存放位置 | 原因 |
|---|---|---|
| 新闻事实 | Search/Web 优先 | 一次性现实锚点，变化快 |
| 数据报告 | Search/Web 优先；反复有用才入库 | 硬信息，但常有时效性 |
| 行业评论 | Search/Web 优先；精选后才入库 | 当前语境有用，但噪声高 |
| 风格样本 | DataBase | 可复用语言材料 |
| 历史典故 | DataBase | 可复用类比和纵深材料 |
| 诗词/文学化用 | DataBase | 可复用象征、句法、气味 |
| 结构样本 | DataBase | 可复用文章形状 |
| 作者历史文章 | DataBase | 持久个人写作记忆 |
| semantic units | DataBase | 可检索文学语义原子 |

DataBase 是 durable semantic corpus。

Search/Web 是一次性现实材料入口。

## 旧 Prompt 兼容

旧 prompt 不应原样塞回 Writer。

正确路线：

```text
旧 prompt
  -> prompt atomization
  -> semantic units
  -> metadata
  -> retrieval
  -> composition
  -> Writer
```

旧 prompt 应拆成：

| Corpus | 作用 |
|---|---|
| Worldview Corpus | 历史观、世界观、认知姿态 |
| Narrative Movement Corpus | 宏观/微观、历史/现实、制度/私密之间的运动 |
| Syntax Corpus | 压缩句、半句推进、非对称句法 |
| Rhythm Corpus | 长句后断裂、冷收束、慢释放、突变 |
| Symbolic Pressure Corpus | 标点、符号、括号、破折号的软压力 |
| Lexicon Universe | 词域、短语、时代语境、连接方式 |

禁止把“必须、禁止、绝对、严禁、只能、不得”这种 instruction grammar 带回 runtime。

## Semantic Unit

DataBase 里的 durable corpus 应拆成可组合 semantic units。

Runtime 只依赖 8 个核心 metadata：

```json
{
  "layer": "reality | literature | semantic | lexicon | structure | author",
  "domain": ["history", "finance"],
  "imagery": ["water", "fog", "steel"],
  "tone": ["cold", "detached"],
  "movement": ["micro_to_macro"],
  "rhetoric": ["hydrology"],
  "source_quality": 0.91,
  "can_support_fact": false
}
```

`can_support_fact` 规则：

| 材料类型 | can_support_fact |
|---|---:|
| 新闻事实 | true |
| 官方数据 | true |
| 行业评论 | false，除非引用了可核查事实 |
| 风格样本 | false |
| 诗词文学 | false |
| 历史典故 | false，除非作为被核查的历史事实材料 |
| 结构样本 | false |
| 作者历史文章 | false，除非是作者自己的事实记录 |

这个字段不是门禁，是上下文角色标注，防止 Writer 把文学材料当现实事实。

## Retrieval

Retrieval 不是一次搜索，而是分层召回。

固定顺序：

```text
1. Reality first
   先确定事实、事件边界、数字、时间、主体。

2. Semantic expansion
   再召回典故、结构、风格、词域、作者记忆、文学材料。

3. Composition rerank
   最后按文章目标重新排序。
```

完整拓扑：

```text
Topic
  -> Semantic Expansion
  -> Query Planning
  -> Multi-channel Search
      -> Web Search
      -> RAGFlow
      -> Semantic Corpus
      -> Literary Corpus
      -> Author Corpus
      -> Lexicon Corpus
  -> Full-text Expansion
  -> Parent-child Expansion
  -> Metadata Extraction
  -> Hybrid Retrieval
  -> Diversity Injection
  -> Aggressive Compression
  -> Composition
```

## Search/Web Runtime

Search/Web 只提供 temporary reality material。Search 本身不是真相。

证据边界：

```text
Evidence Provider
  = 抓取 / 抽取 / 原文质量

DataBase Gateway
  = 来源分级 / 证据投影 / 可信元数据

Article Runtime
  = 只基于 Reality Context 写作
```

Provider 只负责“拿到什么”。

Gateway/DataBase 才负责“这个来源可信到什么级别”。

规则：

| 规则 | 含义 |
|---|---|
| snippet 不是 context | search snippets 只能当发现信号 |
| 全文优先 | composition 前尽量做 full-text expansion |
| metadata 化 | search 结果必须转成 context item |
| 多源收敛 | 现实事实优先由多个来源互相支撑 |
| 临时语料 | 当前新闻、报告、行业评论默认进入 temporary corpus |

Search Pipeline：

```text
Search Query
  -> Search Engine
  -> URL Expansion
  -> Full-text Fetch
  -> Content Extraction
  -> Normalization
  -> Chunking
  -> Embedding
  -> Metadata Extraction
  -> Temporary Corpus
  -> Retrieval Merge
```

当前关键问题不是 gate 不够多，而是 Reality Context 不够真。

下一步唯一高收益能力：

```text
Report/Data Page Resolver
```

它负责把站点级命中推进到文档/数据级证据：

```text
query 命中首页
  -> 发现具体报告页 / PDF / 数据页
  -> 抽全文 / 表格 / 发布时间 / 数据口径
  -> 写入 Reality Context
  -> 文章只能引用这些字段
```

目标是把 evidence 粒度从 host/page 提升到 document/data。

## RAGFlow Reality Runtime

RAGFlow 是 Reality Corpus Runtime，不是简单 topK chunk 检索。

它负责：

- 全文 chunk
- parent retrieval
- citation trace
- long report expansion
- hierarchical retrieval

核心机制：

```text
sentence hit
  -> paragraph expansion
  -> section expansion
  -> document expansion
```

## Hybrid Retrieval

最终召回分数：

```text
final_score =
  embedding_similarity
  + metadata_overlap
  + domain_weight
  + source_quality
  + diversity_bonus
  - contamination_penalty
```

禁止：

```text
topic -> semantic only
```

必须：

```text
topic embedding
+ metadata
+ domain profile
+ source quality
+ diversity
```

## 召回预算

召回预算按 topic profile 动态分配。

| 类型 | Reality | Data | Commentary | History | Literature | Lexicon | Structure | Author |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 现实评论 | 30 | 15 | 20 | 10 | 10 | 7 | 5 | 3 |
| 历史评论 | 10 | 5 | 15 | 30 | 20 | 10 | 7 | 3 |
| 文学化现实评论 | 20 | 10 | 15 | 15 | 20 | 10 | 5 | 5 |

初始召回规模建议：

| 通道 | 规模 |
|---|---:|
| Reality | 50-100 chunks |
| Commentary | 30-80 chunks |
| Literature | 100-300 semantic units |
| Lexicon | 500-2000 tiny units |
| Structure | 20-50 patterns |

策略：

```text
Massive Recall -> Aggressive Compression -> Semantic Rerank -> Context Packing
```

## Composition

Composition 创造 Writer 所处的语言宇宙。

执行顺序：

```text
normalize
  -> contamination filter
  -> dedupe
  -> cluster
  -> rank
  -> budget
  -> compose
  -> pack
```

| 步骤 | 作用 |
|---|---|
| normalize | 统一 web hits、database units、passages、notes |
| contamination filter | 清理低质 SEO、导航页、同名错配、娱乐页、训练集对象泄漏 |
| dedupe | 去掉重复来源和重复意思 |
| cluster | 按 reality、data、commentary、style、allusion、literature、structure、author 分组 |
| rank | 按相关性、信息密度、来源质量、文学复用价值排序 |
| budget | 根据文章类型分配上下文点数 |
| compose | 现实在前，解释居中，风格和结构在后 |
| pack | 用高价值材料填满模型上下文 |

`contamination filter` 是 context hygiene，不是文章 gate。

## Generation Physics

AI prose 污染的根因通常不是“禁词不够”，而是：

```text
evidence 太薄
generation target 太厚
```

所以不要用 `ban_words.txt` 或 `forbidden_metaphors.json` 治理正文。

真正要控制的是生成物理：

| 机制 | 含义 |
|---|---|
| Scope Physics | 文章不能超出 evidence 覆盖范围 |
| Reality Budget | evidence 越薄，表达越朴素；evidence 越厚，才允许更长推理 |
| Analyst Default | 默认人格是 research analyst，不是世界评论作家 |
| Inference Span Control | 限制从局部事实跳到宏大结论的跨度 |

例子：

```text
如果 context 只有 regional gasoline price note，
只能生成 regional analysis，
不能升级成 global civilizational energy stress essay。
```

这不是 gate，也不是词表。

目标是在当前 evidence 条件下，让模型根本不会想写“高级感填充物”。

## Composition Soft Pressure

所有语言压力都归入 Composition Soft Pressure。

目标不是 100% 消灭 AI 味，而是让默认模型惯性越来越难浮上水面。

```text
soft pressure = retrieval bias + context composition bias
```

允许：

| 类型 | 做法 |
|---|---|
| Positive Lexicon Bias | 提高某些词域燃料的召回和排序权重 |
| Negative Style Pressure | 降低 AI 腔、平台政论腔、SEO 总结腔倾向 |
| Native Syntax Bias | 召回更多中文原生句法样本 |
| Symbolic Bias | 降低小括号、破折号、冒号等 symbol inertia |
| Rhythm Bias | 提高压缩、断裂、悬置、慢释放的语料比例 |

禁止：

```text
ban_phrase()
rewrite_sentence()
syntax_repair()
grammar_police()
post_edit()
```

## Context Packing

资料册顺序固定：

```text
1. Topic and target
2. [FACT] Reality anchors
3. [DATA] Hard data
4. [COMMENTARY] Industry commentary
5. [ALLUSION] Historical and cultural material
6. [STYLE] Style and literature samples
7. [LEXICON] Domain words and phrasing fuel
8. [STRUCTURE] Article-shape examples
9. [AUTHOR] Author memory
10. Output request
```

原则：

| 原则 | 含义 |
|---|---|
| Reality first | 现实材料必须先进入上下文 |
| Literature influences, not dominates | 文学材料只影响气味和句法，不主导事实 |
| Lexicon is fuel, not instruction | 词域是表达燃料，不是强制命令 |
| Structure guides softly | 结构样本只软引导文章形状 |
| Writer sees abundance, not scarcity | Writer 应看到足够多、足够密的材料 |

长上下文策略：

```text
小上下文  -> 高压缩、高密度、少风格、多事实
大上下文  -> 大规模召回、长距离材料、多风格混编、完整历史材料
1M context -> 召回 1000，压缩 500，编排 300，pack 200
```

## Diversity 与 Memory

必须优先语义多样性，而不是风格纯度：

```text
prefer semantic diversity over stylistic purity
```

默认建议：

```text
至少 20% unfamiliar material
至少 15% cross-domain material
至少 10% low-frequency imagery
```

Retrieval Memory 只记录：

| 记忆项 | 用途 |
|---|---|
| 哪些 query 有效 | 提高同类 topic 召回质量 |
| 哪些 source 高质量 | 校准 source_quality |
| 哪些 query 经常跑偏 | 降低未来权重 |

不要记录和强化自己的文风偏执、高频 motif、高频意象、过熟 style loop、偶然漂亮句子。

## Audit

Audit 只观察，不阻断，不成为第二作者。

记录：

- 召回数量
- 上下文字数
- 各通道占比
- 使用的资料来源
- 模型耗时
- 存储结果
- imagery / lexicon / allusion / tone / syntax / punctuation / cadence entropy

## Writer

Writer 只写一次。

```text
Single Writer
```

不允许：

- evaluator runtime
- rewrite loop
- AST repair
- prose police
- anti-AI detector
- grammar police
- hard rule engine
- fallback article

唯一允许中断的硬错误：

- topic 为空
- retrieval/runtime API 不可用
- 模型没有返回正文
- 存储失败

## Dify 边界

Dify 可以是：

- UI
- job trigger
- polling surface
- 调用公开模块 API 的 workflow IDE

Dify 不能成为：

- 正文作者
- prompt owner
- durable corpus owner
- 隐藏业务运行时
- ContentBase runtime 的替代品

## 模块真源

每个模块拥有自己的局部真源。根目录只做入口和指向。

| 模块 | Canonical Role | Canonical Docs |
|---|---|---|
| `DataBase/` | durable corpus、Gateway API、semantic units、style/allusion/structure material | `DataBase/README.md`, `DataBase/project.json` |
| `ContentBase/` | Context Engine runtime、long-context packing、single-writer generation、diagnostics、storage calls | `ContentBase/README.md`, `ContentBase/project.json` |
| `ContentAdmin/` | 人类后台 UI 和 adapters | `ContentAdmin/README.md` |
| `fanqie-service/` | 番茄发布执行 | `fanqie-service/README.md` |
| `OpenList/` | 文件访问面 | `OpenList/README.md` |
| `MyBlog/` | 静态博客发布面 | `MyBlog/README.md` |

详见 [MODULES.md](MODULES.md)。

## 当前原则

```text
ContentMRS root = 入口 / 索引 / 边界
DataBase = durable semantic corpus
Search/Web = 一次性现实材料入口
ContentBase = context packing + single writer
Dify = UI / trigger / polling
```

最后原则：

```text
不要控制 Writer。
控制 Writer 所处的语言宇宙。
```

## 部署架构

### 系统拓扑

```text
┌─────────────────────────────────────────────────────────────┐
│  Production Server (腾讯云 CVM)                               │
│                                                               │
│  ┌──────────────┐       ┌──────────────────┐                 │
│  │ ContentBase  │──────▶│ DataBase Gateway  │                 │
│  │ :5111        │       │ :18090            │                 │
│  │ Writer 调用   │       │ 所有数据出口       │                 │
│  └──────┬───────┘       └───┬──────┬───────┘                 │
│         │                   │      │                          │
│         ▼                   ▼      ▼                          │
│  ┌────────────┐     ┌─────────┐ ┌──────────────────┐        │
│  │ sub2api    │     │ RAGFlow │ │ Web Evidence     │        │
│  │ (外部 LLM) │     │ :9380   │ │ Provider :19091  │        │
│  └────────────┘     └────┬────┘ └───────┬──────────┘        │
│                           │              │                    │
│                           ▼              ▼                    │
│                     ┌──────────┐  ┌───────────┐              │
│                     │DashScope │  │ Tavily    │              │
│                     │Embedding │  │ Web Search│              │
│                     └──────────┘  └───────────┘              │
│                                                               │
│  ┌─────────────────────────────────────┐                     │
│  │ MySQL (腾讯云 CloudBase)             │                     │
│  └─────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### 外部依赖

| 类别 | 服务商 | 用途 | 可替换为 |
|------|--------|------|----------|
| 云服务器 | 腾讯云 CVM | 跑所有后端 | 任何 Linux VPS |
| MySQL | 腾讯云 CloudBase | 数据存储 | 任何 MySQL 8.0+ |
| Writer LLM | sub2api → OpenAI | 文章生成 (gpt-5.5) | 任何 OpenAI 兼容 API |
| Embedding | 阿里云 DashScope | 向量化检索 (text-embedding-v3) | 任何 RAGFlow 支持的 embedding |
| Web 搜索 | Tavily | Reality 事实检索 | 任何搜索 API |
| 向量引擎 | RAGFlow (self-hosted) | 文档向量检索 | — |

### 配置模板

所有配置集中在 `.env.template`。部署时复制为 `.env` 填入实际值：

```bash
cp .env.template .env
# 编辑 .env 填入你的 API keys 和服务器信息
```

详见 [.env.template](.env.template)。

### 部署命令

```powershell
# 部署全部服务
powershell scripts/deploy.ps1

# 只部署某个服务
powershell scripts/deploy.ps1 -Target gateway
powershell scripts/deploy.ps1 -Target contentbase
powershell scripts/deploy.ps1 -Target web-evidence
```

部署流程：本机 build → scp 编译产物到服务器 → restart systemd。
服务器上不维护源码，只跑编译后的 JS。

### 本地开发

```bash
cd ContentBase && pnpm dev          # ContentBase dev server :5101
cd DataBase/apps/gateway && pnpm dev # Gateway dev server :18090
```

本机通过 `~/.codex-secrets/` 下的 .env 文件自动加载凭据，无需手动配置。

---



### P0：旧提示词拆解入库

将手工时期的写作提示词（`E:\My Project\之前的给ai生成文章的提示词`）拆解为可被检索召回的 semantic units，入库 DataBase。

旧提示词本质是一份手工 Composition Layer，包含：

| 旧提示词板块 | 拆解目标 | 入库形态 |
|---|---|---|
| 板块五：词汇库 | Lexicon chunks | 小粒度 chunk（词组/短语级），带 domain + tone metadata |
| 板块六：引用/化用素材库 | Literary + Allusion chunks | 每条引用独立 chunk，带 source + era + stance + 适用情境 |
| 板块四：比喻系统 | Rhetoric chunks | 按比喻类型（水文/建筑/机械/神学/戏剧）分类标注 |
| 板块三：结构模块（起承转合路径） | Structure chunks | 每种结构路径一个 chunk，带体裁适用标注 |
| 板块一：思想底色 + 视角 | Author State seed vectors | 转为 author-conditioned rerank 的 query seeds |
| 板块二：叙事技法 | 保留在 Writer prompt | 不入库，作为 Writer 的基础能力描述 |
| 板块四：禁令 | Composition negative bias | 不作为硬规则，转为 retrieval 时的负向权重信号 |

原则：
- 不全量塞进 RAGFlow。RAGFlow 管长文档（书、报告）；细粒度 semantic unit 在 DataBase 自有向量索引
- 不把规则写死在 prompt 里。禁令变成 retrieval bias，让 Writer 的语言宇宙里自然没有那些东西
- 入库后可被 Retrieval 按 topic 自动召回，不需要每次手动选材

### P1：Composition Layer 实体化

当前 Composition 几乎不存在——检索结果直接拼进 prompt。需要实现完整的 composition 步骤：

```text
Retrieval 返回 ~200 chunks
  → 按类型分组（FACT / DATA / COMMENTARY / ALLUSION / STYLE / LEXICON / STRUCTURE / AUTHOR）
  → 按 topic profile 分配预算
  → 去重 + contamination filter
  → diversity injection
  → 按固定顺序打包成最终 context
  → 交给 Writer
```

预算表按体裁自动切换：

| 体裁 | Reality | Commentary | Allusion | Literary | Lexicon | Structure |
|---|---:|---:|---:|---:|---:|---:|
| 历史评论 | 15% | 15% | 25% | 20% | 15% | 10% |
| 现实评论 | 30% | 25% | 15% | 10% | 12% | 8% |
| 小说/叙事 | 10% | 5% | 20% | 35% | 15% | 15% |
| 文案/短文 | 20% | 15% | 20% | 20% | 15% | 10% |

### P2：Author State 从规则变成 retrieval signal

Author State 不应该是 system prompt 里的硬规则（"你必须文白夹杂"），应该是：

- 一组 embedding 坐标，代表品味偏好
- Retrieval 时用 author state 做 rerank（已有 author-conditioned rerank 概念，需落地）
- 效果：Composition 自然召回大量符合品味的样本，Writer 在这个语言宇宙里自然写成那样
- 体裁通用：同一个 author state，写评论时召回评论类材料，写小说时召回叙事类材料

### P3：体裁通用性

同一个 pipeline 支持评论、小说、文案，不分叉 Writer：

- Retrieval 感知体裁意图 → 调整召回类型比例
- Composition 按体裁切换预算表
- Writer prompt 不变 → 体裁由上下文决定，不由 instruction 决定
- AI Agent 传入的软参数里包含体裁暗示，ContentMRS 自动路由到对应的 retrieval + composition 策略

### 架构约束

- RAGFlow 只管长文档检索（书、报告、历史全文）
- DataBase 自有向量索引管细粒度 semantic unit（词汇、比喻、结构、引用）
- 不全量 RAGFlow：细粒度 chunk 不适合 RAGFlow 的 parent-child 检索模型
- 最大瓶颈是 Corpus 精细度 + Composition 层厚度，不是 Writer，不是 RAGFlow
- 旧提示词的价值在于材料（词汇、引用、比喻），不在于规则（禁令）
