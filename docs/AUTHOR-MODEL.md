# 作者模型（Author Model）

本文档是 ContentMRS **写作哲学** 的产品真源，与 [CONTRACT.md](../CONTRACT.md) §7 一致。  
技术缝合见 [INTEGRATION.md](INTEGRATION.md)；只传 `topic` 见 [SOFT-GENERATE.md](SOFT-GENERATE.md)。

## 一句话主旨

**ContentMRS 不是「带检索的作文机」，而是一个可并行阅读文学与史料、在作者合同下写成散文、用批评家去掉 AI 病与脏料后再出厂的生成系统。**

## 五条不可删原则

1. **作者态优先** — 合同真源是操作者的写作观（视角、抒情许可、词汇库），不是 notebook 显示名，也不是 StylePack 元数据标签名。
2. **多库共读** — 文学（句法/意象，如三岛受限 style 源）与史书（词面/制度判断，如兴亡卷）**同时进入 context**，由 relevance 筛选，由 Writer **自由化合**；借鉴≠复写情节或原句。
3. **议论即散文** — 不区分「论文模式 / 影评模式」；surface 规则只拦 **AI 套语与标点病**，不拦隐喻、情绪、联想、突然转折。
4. **引经据典是触发器** — 具名文书、报道、裁定、史书段落 **触发判断**；禁止 SEO 标题、舆情口号、Youtube 壳句进正文。
5. **出厂过批评家** — `quality` 出现 `block` 级 violation 时必须 **revision 改写或失败**；禁止「有正文就算成功」。

## 「真实架构」比喻（非神经网络）

| 部位 | 实际组件 |
|------|----------|
| 感官（读） | Gateway `EvidencePack` + `StylePack` + `web-evidence` |
| 海马（边界） | `material-notebooks.json` + `/scope/resolve` + `excludeQueries` |
| 性格（作者） | `topic-corpus` + creative style protocol + vocabulary |
| 语言区（写） | sub2api → 默认 `qwen-plus`；`writingBrief` + Writer/Reviewer agents |
| 前额叶（删烂） | `observe` + `revision`；拦套语/离题料，**不拦抒情** |

## AuthorState（MVP，非 preset、非必训向量）

人类作者会同时读小说与史书。MVP 的 AuthorState **不是**必须先有一个训练好的 dense embedding，而是：

```txt
作者合同 + 词表 + 禁用表面病 + 风格样本检索结果（styleQuery passages）
```

系统用 **检索偏置 + in-context 风格样本** 实现人格连续，不用 `topic-corpus` preset 树：

| 信号 | 来源 | 作用 |
|------|------|------|
| **文学句法** | 显式 `styleQuery` → `book_kinkakuji_restricted_style` 等 | 句长、物象→心理；**禁止**复写情节与标志性专名 |
| **史论词面** | 检索拉回史书 chunks + vocabulary | 制度词、冷峻词面；**不**自动绑兴亡 preset |
| **当代事实** | `web.search` + EvidencePack | 裁定、报道；Gateway `excludeQueries` 剔 SEO/舆情壳 |

跑稳后再演进：AuthorState 向量化、author-conditioned rerank 分项、DSPy 优化 program。见 [GENERATION-KERNEL.md](GENERATION-KERNEL.md) 八步实现顺序。

**无自动车道**。材料边界仅来自显式 `scope-*` / `sourceIds` / `ragflowDatasetIds` 或 open 默认检索。

## Latent MVP 扩展（可回退）

- 检索层可接入 learned rerank（`DATABASE_EVIDENCE_LATENT_RERANK_URL`），但不是硬依赖。
- 写作层新增 `latentControl`（style/fact blend）作为 AuthorState 的连续控制信号。
- 任一 learned 组件失败时必须回退到当前稳定链路，不得阻断正文生成。

## 观察器边界

- **拦**：不是…而是…、不靠…靠…、机制接口堆砌、破折号（若合同启用）、禁用词表、离题 web 料、无锚扩写。
- **不拦**：抒情、隐喻、跳跃联想、批判中的温度与狠劲（「深情的冷酷」）。

## 模型路由与风控策略（Tier-1）

- 主题被 provider moderation 拦截时，系统仍需保留作者模型主旨，不得回退到 lane/preset 写法。
- 运行时错误必须暴露 `provider/model/endpoint/status`，让操作者能按白名单路由切换。
- 推荐 fallback 顺序：同 provider 更稳模型 -> 备用 provider 白名单模型；切换仅改路由，不改作者合同与生成内核。

## 配置真源

| 用途 | 文件 |
|------|------|
| **作者检索（读）** | `material-notebooks.json` → `retrieval`；见 [**AUTHOR-RETRIEVAL.md**](AUTHOR-RETRIEVAL.md) |
| 材料边界 / 软路由 | 同上 + `POST /scope/resolve` |
| 词表（可选 `topicId`） | `topic-corpus.v2-open`（空 topics；无自动语气） |
| 作者复合块（代码） | `ContentBase/product/novel/app/article/author-style-composite.mjs` |
| 操作者长合同 | 工作区 `之前的给ai生成文章的提示词` → `import:author-lexicon` 增量进 vocabulary |

同步与导出不属于 ContentMRS root。材料边界、topic corpus、作者合同
由 DataBase 与 ContentBase 各自的模块契约维护；Dify 只通过公开 API
或模块自有 SDK 调用。
