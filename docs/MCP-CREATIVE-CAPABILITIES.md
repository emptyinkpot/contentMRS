# MCP / Creative Capability Index

本文件记录当前 Codex 环境里已经暴露、可用于内容生产的 MCP 与 skills。它只是能力索引，不是 ContentMRS 运行时配置，也不是 Dify workflow 真源。

## 结论

当前没有观察到一个明确的“直接生成 `.pptx` 的 MCP”。PPT/演示类工作可以通过 Canva presentation skill 做成可编辑 Canva deck，或者先生成 Markdown/HTML，再导出 PDF/演示稿。

PDF 能力是明确存在的，但分成两类：

- 读取/转换 PDF：MarkItDown MCP 可以把 PDF、Office、网页等转 Markdown。
- 生成/导出 PDF：Pencil MCP 可以把 `.pen` 设计节点导出为 PDF；HTML 页面也可以通过浏览器打印成 PDF，但这不是独立 PDF MCP。

## 可用能力

| 类别 | 当前入口 | 状态 | 适合做什么 | 注意 |
|---|---|---|---|---|
| PPT / 演示 | `canva-branded-presentation` skill | 可用，但不是 MCP | 根据材料生成品牌化 Canva 演示文稿 | 依赖 Canva 账号/会话/品牌套件；未观察到 `.pptx` 直出 MCP |
| PDF 读取 | `mcp__markitdown_mcp__.convert_to_markdown` | 可用 MCP | PDF、Office、网页、YouTube 等转 Markdown | 它是“转 Markdown”，不是“生成 PDF” |
| PDF 导出 | `mcp__pencil__.export_nodes(format: "pdf")` | 可用 MCP | 把 `.pen` 设计页导出为多页 PDF | `.pen` 内容只能用 Pencil MCP 读写，不能直接用文件读取 |
| 设计稿 | `mcp__pencil__` | 可用 MCP | 做页面、海报、UI、A4 版式，并导出 PNG/JPEG/WEBP/PDF | 适合视觉排版，不适合直接当文本知识库 |
| 图表 / 架构图 | `mcp__plantuml_diagrams__` | 可用 MCP | PlantUML 编码/解码，配合图表生成链路使用 | 当前暴露的是 encode/decode 能力；若要落图需结合可用渲染入口或其他工具 |
| 图表 / draw.io | `mcp__drawio_diagrams__` | 已发现 MCP | 从 Mermaid、CSV、XML 生成或打开 draw.io 图 | 用于架构图、流程图、ER、时序图等 |
| 图片生成 | `imagegen` skill / native image generation | 可用 skill | 生成或编辑位图、封面、插图、素材 | 更适合 raster asset，不是 PPT/PDF 原生工具 |
| 音视频处理 | `mcp__media_video_video_audio_mcp__` | 可用 MCP | 抽音频、转码、改码率/分辨率/帧率、去静音 | 偏后期处理，不负责文案生成 |
| 视频下载/音频 | `mcp__media_video_yt_dlp_mcp__` | 可用 MCP | 从支持平台提取音频等 | 需要合法来源和网络可用 |
| 音频抽取 | `mcp__media_video_ffmpeg_mcp__.extract_audio` | 可用 MCP | 从视频抽 MP3 | 单项 ffmpeg wrapper |

## 推荐用法

### 做 PPT / 演示

优先路线：

1. 用资料生成 slide brief 和逐页大纲。
2. 触发 `canva-branded-presentation` skill 生成 Canva deck。
3. 如果需要本地文件，再从 Canva 侧导出 PDF/PPTX。

可对我这样说：

```text
把 docs/AUTHOR-MODEL.md 做成 12 页演示，偏产品架构汇报，用 Canva。
```

当前限制：

- 没有发现可直接在本机 MCP 中生成 `.pptx` 的工具。
- 如果必须本地直出 `.pptx`，需要另接 PowerPoint/LibreOffice/Pandoc 等明确执行链。

### 做 PDF

设计型 PDF：

1. 用 Pencil 做 `.pen` 版式。
2. 用 `export_nodes(format: "pdf")` 导出。

文本型 PDF：

1. 先生成 Markdown 或 HTML。
2. 用浏览器/本地工具导出 PDF。

可对我这样说：

```text
把这个主题做成一页 A4 PDF 讲义，正文冷峻一点，导出 PDF。
```

### 读 PDF / Office / 网页

用 MarkItDown：

```text
把 E:\资料\xxx.pdf 转成 Markdown，放到 ContentMRS docs 下。
```

适合进入知识库前的清洗、摘要、拆分、索引。

### 画架构图

可选路线：

- PlantUML：适合时序图、类图、组件图。
- draw.io：适合可编辑流程图、架构图。
- Pencil：适合更像设计稿/汇报图的视觉排版。

可对我这样说：

```text
根据 docs/dify-orchestration.md 画一张 ContentMRS 与 Dify 的模块关系图，导出 SVG。
```

## 和 ContentMRS 的边界

这些能力目前属于 Codex agent 工具层，不是 ContentMRS 模块 SDK。ContentMRS 根仓只记录能力和用法：

```text
ContentMRS root = folder / inventory / boundary docs
Dify = orchestration
Each module = independent service + own SDK + own deployment
Codex MCP / skills = 本地创作辅助工具
```

如果以后要让 Dify 调用这些能力，需要把对应能力封装成独立 HTTP 服务或模块 SDK，再由 Dify 编排；不要把 MCP 临时状态写成 ContentMRS 的运行时真源。
