# ContentMRS API 文档

## 基本信息

- 端点：`http://<SERVER_IP>:5111`
- 鉴权：`Authorization: Bearer <CONTENTBASE_API_KEY>`
- 超时建议：5分钟

## POST /api/content/runtime/generate/article

生成一篇文章。

### 请求

```json
{
  "topic": "亚洲门罗主义",
  "genre": "historical-essay",
  "wordCount": 8000,
  "target": "论证方向和结构要求（自然语言）",
  "settings": {
    "model": "claude-sonnet-4-6",
    "temperature": 0.4,
    "maxTokens": 16000,
    "literaryInterval": 1000,
    "literaryMinCount": 5
  }
}
```

### 参数说明

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| topic | string | 是 | - | 文章主题 |
| genre | string | 否 | essay | 体裁，影响模型路由和检索策略 |
| wordCount | number | 否 | 2400 | 目标字数，不足90%自动续写 |
| target | string | 否 | - | 写作方向、结构要求 |
| settings.model | string | 否 | 按genre路由 | 手动指定模型 |
| settings.temperature | number | 否 | 0.4 | 生成温度 |
| settings.maxTokens | number | 否 | 4096 | 最大输出token |
| settings.literaryInterval | number | 否 | 1000 | 每N字要求1处文学化用 |
| settings.literaryMinCount | number | 否 | 5 | 全文最少化用次数 |
| evidenceQuery.includeWeb | boolean | 否 | true | 是否搜索Web |
| evidenceQuery.includeRagflow | boolean | 否 | true | 是否搜索RAGFlow |
| evidenceQuery.webQueries | string[] | 否 | - | 额外搜索关键词 |

### genre 值与模型路由

| genre | 模型 | 场景 |
|-------|------|------|
| historical-essay | Claude Sonnet 4.6 | 政论、视频文案、时事评论 |
| essay | Claude Sonnet 4.6 | 独立文章、散文 |
| reality_commentary | Claude Sonnet 4.6 | 现实评论 |
| narrative | Qwen Max | 小说章节 |
| fiction | Qwen Max | 虚构叙事 |

### 响应

```json
{
  "success": true,
  "data": {
    "draft": {
      "body": "正文（纯文本）",
      "continuations": 0,
      "modelInvocation": {
        "provider": "openai-compatible",
        "model": "claude-sonnet-4-6",
        "usage": {"prompt_tokens": 35000, "completion_tokens": 3600}
      }
    },
    "context": {
      "evidence": {"pack": {}},
      "diagnostics": {
        "contextTokenBudget": 39000,
        "contextCharBudget": 50000,
        "packedCounts": {"reality": 13, "literary": 33, "semantic": 4, "lexicon": 46, "structure": 3, "author": 3}
      }
    }
  }
}
```

### 错误响应

```json
{"success": false, "error": "错误信息"}
```

常见错误：
- `Unauthorized: invalid or missing API key` — 缺少或错误的API key
- `Reality required: zero Reality items survived context packing` — topic没有找到足够事实材料
- `evidence search unavailable` — 数据库连接问题，重试即可
- `fetch failed` / `Writer returned no article body` — LLM连接不稳定，系统会自动重试2次

## GET /api/health

健康检查，无需鉴权。

```json
{"success": true, "data": {"service": "contentbase", "uptimeSec": 123}}
```

## GET /api/corpus/diagnostics

语料库诊断信息，需要鉴权。返回各数据源状态。

## 调用示例

### curl

```bash
curl -X POST http://<SERVER_IP>:5111/api/content/runtime/generate/article \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer cb-k9Xm4wPqR7vJ2nLs5tYh8dFe" \
  -d '{"topic":"满洲人征服中国的历史悖论","genre":"historical-essay","wordCount":8000}'
```

### Python

```python
import requests

resp = requests.post(
    "http://<SERVER_IP>:5111/api/content/runtime/generate/article",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer cb-k9Xm4wPqR7vJ2nLs5tYh8dFe",
    },
    json={
        "topic": "满洲人征服中国的历史悖论",
        "genre": "historical-essay",
        "wordCount": 8000,
    },
    timeout=300,
)
data = resp.json()
if data["success"]:
    print(data["data"]["draft"]["body"])
```

### Node.js

```javascript
const resp = await fetch("http://<SERVER_IP>:5111/api/content/runtime/generate/article", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer cb-k9Xm4wPqR7vJ2nLs5tYh8dFe",
  },
  body: JSON.stringify({
    topic: "满洲人征服中国的历史悖论",
    genre: "historical-essay",
    wordCount: 8000,
  }),
});
const data = await resp.json();
console.log(data.data.draft.body);
```
