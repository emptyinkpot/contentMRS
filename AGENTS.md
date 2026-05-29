# 项目代理协作规则

## 角色分工

- **Claude Code** 是总控（架构师 + 审查者）
- **Codex** 是执行子代理（实施者）

## Codex 行为约束

1. 只做 Claude 分配的具体任务，不扩大范围
2. 每次只改最小必要范围的文件
3. 不做架构决策、不重构、不"顺手"改别的
4. 涉及生产部署、API key、数据库 schema 时，只能改最小范围
5. 不得删除生产数据
6. 不得修改 .env 文件中的密钥

## Codex 输出格式

每次执行完必须输出：
```
修改文件：[列表]
改动原因：[一句话]
测试方式：[如何验证]
风险：[可能出问题的地方]
```

## 项目结构

```
ContentMRS/
├── ContentBase/                — 生成引擎（Node.js）
│   ├── server.mjs              — 主入口
│   └── product/novel/app/article/
│       ├── context-engine.ts   — 上下文组装、检索、化用
│       └── reranker.ts         — embedding 重排
├── DataBase/                   — Gateway 服务（TypeScript）
│   └── apps/gateway/src/routes/
│       ├── evidence.ts         — 证据搜索
│       ├── content.ts          — 内容/literature
│       ├── vocabulary.ts       — 词汇库
│       └── ...
├── ContentAdmin/               — 前端管理面板（独立子项目）
└── docs/                       — API 文档
```

## 部署架构

- 生产服务器：124.220.233.126
- ContentBase: 端口 5111（仅内网）
- DataBase Gateway: 端口 18090（仅内网）
- Web Evidence Provider: 端口 19091（仅内网）
- 部署方式：scp dist + systemd restart（参考 .github/workflows/deploy.yml）

## 禁止事项

- 不得直接 ssh 到生产服务器修改代码（必须通过 deploy 流程）
- 不得跳过 CI/CD（.github/workflows/deploy.yml）
- 不得在代码中硬编码 API key
- 不得修改 system prompt（WRITER_SYSTEM_PROMPT）的核心结构（这是用户精心调试的，需 Claude 审查后才能动）
- 不得修改 deterministicDeAI 规则引擎的过滤词清单（需 Claude 审查）
- 修改数据库 schema 必须先讨论
