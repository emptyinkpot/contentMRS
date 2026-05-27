# sub2api — 公共基础设施（不属于 ContentMRS）

## 定位

| 项 | 说明 |
|----|------|
| 角色 | 全 workspace 共用的 **LLM/API 网关** |
| 部署真源 | **server-170**，`/srv/sub2api` |
| 公网 | `https://sub2api.tengokukk.com/v1` |
| 源码 | **`../sub2api`** 或环境变量 **`SUB2API_REPO`**（与 ContentMRS 平级，勿放在 `ContentMRS/` 下） |

ContentMRS modules **only consume** sub2api through consumer API keys. sub2api is external infrastructure and must not be recreated as a ContentMRS root runtime member.

## ContentMRS 消费者

| 项 | 值 |
|----|-----|
| 分组 | `contentmrs-novel-qwen` |
| Key 名 | `contentmrs-novel-generation` |
| 客户端密钥（推荐路径） | `~/.codex-secrets/sub2api/consumers/contentmrs-novel.env` |
| 旧路径（仅读取兼容，勿再写入） | `~/.codex-secrets/contentmrs/sub2api-novel.env` |

在 170 上初始化消费者（DashScope 上游 + Key）：

```powershell
cd ../sub2api   # 或 cd $env:SUB2API_REPO
pwsh -File ./deploy/ops/bootstrap-contentmrs-consumer.ps1 -Skip124
```

或：

```powershell
node ./deploy/ops/bootstrap-contentmrs.mjs
```

## 与 ContentMRS runtime 的关系

```text
ContentMRS runtime (本机)
  web-evidence → gateway → contentbase
                              ↓ HTTPS
                    sub2api @ 170（公共基础设施，非 MRS 成员）
```

维护 sub2api 平台：改 **sub2api 仓**（`../sub2api` / `SUB2API_REPO`）与 170 部署，不要改 ContentMRS 联邦清单。
