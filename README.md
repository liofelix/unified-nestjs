# Unified NestJS

基于 NestJS、TypeORM 和 PostgreSQL 的后端服务。

## 环境要求

- Node.js
- pnpm
- PostgreSQL
- Redis

## 安装依赖

```bash
pnpm install
```

## 环境配置

应用通过 `NODE_ENV` 选择环境文件：

- 未设置或非 `production`：读取 `.env.development`
- `NODE_ENV=production`：读取 `.env.production`

开发环境配置已提供在 `.env.development`。启动前请确保 PostgreSQL 已创建 `DB_DATABASE` 指定的数据库，并允许 `DB_USER` 连接。

生产环境的 `.env.production` 仅作为字段模板。部署时应通过部署平台的环境变量注入真实值，避免将生产凭据提交到仓库。

| 变量 | 说明 | 是否使用 |
| --- | --- | --- |
| `APP_NAME` | 应用名称，开发环境默认为 `Unified NestJS` | 否 |
| `APP_PORT` | HTTP 服务端口，开发环境默认为 `3000` | 否 |
| `APP_API_PREFIX` | 全局接口前缀，开发环境默认为 `api` | 否 |
| `APP_SWAGGER_PATH` | Swagger 文档路径，开发环境默认为 `api/docs` | 否 |
| `APP_SWAGGER_VERSION` | Swagger 文档版本，开发环境默认为 `1.0` | 否 |
| `DB_HOST` | PostgreSQL 主机地址 | 是 |
| `DB_PORT` | PostgreSQL 端口 | 是 |
| `DB_USER` | PostgreSQL 用户名 | 是 |
| `DB_PASSWORD` | PostgreSQL 密码 | 是 |
| `DB_DATABASE` | 应用连接的数据库名称 | 是 |
| `DB_NAME` | 预留字段 | 否 |
| `JWT_SECRET` | JWT 签名密钥 | 是 |
| `JWT_EXPIRES_IN` | JWT 过期时间，未设置时默认为 `1h` | 否 |
| `REDIS_URL` | Redis 连接地址，支持 `redis://` 和 `rediss://` | 是 |
| `AGENT_LLM_API_KEY` | OpenAI 或兼容模型服务的 API Key；已注册 Agent 必填 | 对话 Agent 是 |
| `AGENT_LLM_BASE_URL` | OpenAI 兼容模型服务的 Base URL；使用 OpenAI 默认地址时可留空 | 否 |
| `AGENT_LLM_MODEL` | 模型名称，例如服务商提供的支持函数调用的模型 | 对话 Agent 是 |
| `AGENT_LLM_API_MODE` | `chat_completions`（默认）或 `responses` | 否 |
| `AGENT_TRACING_ENABLED` | 是否开启 Agents SDK tracing，默认 `false` | 否 |

数据库连接由 TypeORM 在应用启动时建立：开发环境开启 `synchronize`，会自动创建或同步表结构；生产环境关闭 `synchronize`，不会自动创建或修改表结构。

## 统一响应格式

接口成功和失败响应都会统一封装为 `code`、`data`、`msg`：

```json
{
  "code": 200,
  "data": {},
  "msg": "success"
}
```

`code` 与 HTTP 状态码一致。失败时 `data` 为 `null`，`msg` 为错误信息。

## 用户接口

用户表使用 UUID 主键，密码仅保存 bcrypt 哈希且不会出现在响应中。当前未接入认证上下文，创建人、更新人和删除人字段会保留为空。

用户管理接口默认需要 JWT。调用时需在请求头传入登录接口返回的 token：

```http
Authorization: Bearer <accessToken>
```

在 Swagger 的 Authorize 弹窗中只填写登录返回的 `accessToken` 值，不需要手动加 `Bearer ` 前缀。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/users` | 需认证。创建用户，传入 `username`、`email`、`password`。 |
| `GET` | `/api/users?pageNo=1&pageSize=20` | 需认证。分页查询未删除用户，返回 `{ items, total, pageNo, pageSize }`。 |
| `GET` | `/api/users/:id` | 需认证。查询单个未删除用户。 |
| `PATCH` | `/api/users/:id` | 需认证。更新用户名或邮箱。 |
| `DELETE` | `/api/users/:id` | 需认证。软删除用户，记录删除时间，成功时返回 `code: 200`。 |

## 认证接口

认证模块使用 Passport 和 JWT。除登录接口和明确标记公开的接口外，业务接口默认需要 `Authorization: Bearer <token>`。登录字段为 `username` 和 `password`。每个 JWT 都有唯一标识，登出时会将当前 token 加入 Redis 撤销列表，直至 token 自然过期。Redis 不可用时，受保护接口会返回 `503`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/auth/login` | 登录，传入 `username`、`password`，成功时 `data` 返回 `accessToken`。 |
| `POST` | `/api/auth/logout` | 需认证。撤销当前 token。 |

## Agent 与对话接口

所有 Agent 统一由对话模块调用。创建会话时指定不可变的 `agentCode`，后续发送消息只需要传入会话 ID 和本次用户消息；服务端会从数据库读取最近 20 条消息作为 Agent 上下文。所有接口均需 JWT。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/agents` | 获取当前可用 Agent 的代码、名称和描述。 |
| `POST` | `/api/chat/conversations` | 创建会话，传入 `agentCode`，可选 `projectId`、`title`。 |
| `GET` | `/api/chat/conversations?pageNo=1&pageSize=20` | 分页查询自己的未删除会话；可选 `projectId`、`agentCode` 筛选。 |
| `GET` | `/api/chat/conversations/:id` | 查询会话详情。 |
| `PATCH` | `/api/chat/conversations/:id` | 更新会话标题或项目空间；不可修改 `agentCode`。 |
| `DELETE` | `/api/chat/conversations/:id` | 软删除会话及其消息的访问入口。 |
| `GET` | `/api/chat/conversations/:id/messages` | 按时间正序查询该会话的全部历史消息。 |
| `POST` | `/api/chat/conversations/:id/messages/stream` | SSE 发送消息；请求体仅含 `message`。 |

流式接口依次发送：

- `meta`：`{ "requestId": "...", "conversationId": "...", "agentCode": "weather" }`
- `delta`：`{ "text": "..." }`
- `done`：`{ "requestId": "...", "assistantMessageId": "..." }`
- `error`：`{ "code": "...", "message": "..." }`

当前仅提供 `weather` Agent，用于查询当前、今天和明天的天气。函数工具与输入/输出 Guardrails 分别位于 `src/agents/tools`、`src/agents/guardrails`；Guardrails 会拦截明显的提示注入、超长上下文和敏感输出。Agent 生成失败或客户端断开时，用户消息会保留，未完成的助手消息不会持久化。

## 天气接口

天气模块的直连接口使用 [Open-Meteo](https://open-meteo.com/)；它们公开访问，不使用 Agent。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/weather/today?city=北京&countryCode=CN` | 查询指定城市今天的标准化天气摘要。`countryCode` 可选。 |
| `GET` | `/api/weather/tomorrow?city=北京&countryCode=CN` | 查询指定城市明天的标准化天气摘要。`countryCode` 可选。 |

天气 Agent 使用 OpenAI Agents SDK 的函数工具查询当前、今天和明天的天气。第三方模型需实现 OpenAI 兼容的 Chat Completions 或 Responses 函数调用协议；默认使用 `chat_completions`。

## 运行

```bash
# 开发环境
pnpm run start

# 开发环境，监听文件变化
pnpm run start:dev

# 构建
pnpm run build

# 生产环境（自动设置 NODE_ENV=production）
pnpm run start:prod
```

HTTP 服务端口通过 `APP_PORT` 环境变量配置，开发环境默认为 `3000`。所有接口统一使用 `APP_API_PREFIX` 配置的前缀，开发环境默认为 `/api`，例如根接口为 `/api`。

## 检查

```bash
# Oxlint
pnpm run lint

# 格式检查
pnpm run format:check
```
