# 联网证据（Web Evidence）

124 上 Gateway 已配置 `DATABASE_EVIDENCE_WEB_SEARCH_URL=http://127.0.0.1:19091/search`。

## 密钥（推荐 Tavily）

从 124 出网测试：**Tavily API 可达**；DuckDuckGo 在境内机房易超时。

在本机创建：

```text
%USERPROFILE%\.codex-secrets\web-evidence\tavily.env
```

内容示例：

```env
WEB_EVIDENCE_HOST=127.0.0.1
WEB_EVIDENCE_PORT=19091
WEB_EVIDENCE_PROVIDER=tavily
TAVILY_API_KEY=tvly-xxxxxxxx
TAVILY_SEARCH_DEPTH=basic
TAVILY_MAX_RESULTS=8
```

同步并重启由 `web-evidence-provider` 模块负责。ContentMRS root 不保存
Tavily 部署脚本，也不重启该服务。

验收：

```powershell
curl.exe -fsS "https://database.tengokukk.com/health"
# optionalDownstreams 不再因 web 配置缺失而 503

# 需 API Key：
# GET .../evidence/search?q=test&includeWeb=true&limit=3
```
