# Codex Capabilities Local Copy

这里是从本机 Codex control plane 复制到 ContentMRS 根下的创作能力说明副本，方便后续查阅和迁移。

## 目录

- `skills/`
  - `canva-branded-presentation/`
  - `canva-resize-for-all-social-media/`
  - `canva-translate-design/`
  - `imagegen/`
  - `markitdown/`
  - `screenshot/`
- `mcps/`
  - `markitdown-mcp/`
  - `drawio-diagrams/`
  - `plantuml-diagrams/`
  - `media-video/`

## 注意

这不是 ContentMRS 的运行时，也不是 Dify workflow。它只是能力文档和入口副本。

真正执行时仍以当前 Codex MCP / skill 注册为准；如果以后要给 Dify 调用，需要把对应能力独立封装为 HTTP 服务或模块 SDK。
