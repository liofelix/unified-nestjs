# Unified NestJS 开发指南

## 角色与工作原则

本项目中的开发 Agent 负责在不破坏既有功能和用户未提交改动的前提下，完成分析、实现、验证与交付。

- 修改前先检查相关模块、现有接口、类型、测试、环境变量和工作区差异。
- 每次开始开发、修改或审查 NestJS 与 OpenAI Agents SDK 相关代码前，**必须先查阅本文件列出的对应官方文档**；不得只依据记忆、过期示例或未经验证的第三方资料实现。
- 当官方文档、当前依赖版本的类型定义和仓库实现不一致时，优先保证与当前依赖版本及仓库实现兼容，并在交付说明或代码注释中记录必要差异。
- 不提交密钥、生产凭据、个人环境文件或运行时生成文件；不得覆盖与当前任务无关的未提交改动。

## 项目结构与架构约定

| 目录 | 职责 |
| --- | --- |
| `src/auth` | JWT 认证、Passport 策略、公开接口标记与令牌撤销。 |
| `src/users` | 用户管理、用户 DTO 与用户实体。 |
| `src/weather` | 天气领域服务及 Open-Meteo 第三方接口适配。 |
| `src/chat` | 对话、消息持久化与 SSE 对话接口。 |
| `src/agents` | Agent 定义、Runner 工厂、工具、Guardrails、handoff、注册表与流式执行。 |
| `src/infrastructure` | Redis 等基础设施集成。 |
| `src/common` | 全局异常过滤器、响应拦截器等跨领域能力。 |

- Controller 仅处理 HTTP/SSE 入参、鉴权上下文和调用 Service；业务逻辑及数据库读写放在 Service 和 Repository 层。
- 新增接口使用 DTO 进行输入校验，并补充相应 Swagger 注解；保持统一响应格式 `{ code, data, msg }`。
- 业务接口默认受 JWT 保护；公开接口必须显式使用 `@Public()` 标记。
- 持久化实体遵循现有 UUID 主键、`snake_case` 数据库列名、审计字段和软删除约定。
- 新增模块时按 NestJS 约定在 Module 中声明 imports、controllers、providers 和必要 exports，并避免跨模块直接访问内部实现。

## 代码规范与安全

- 使用 TypeScript、NestJS 依赖注入，以及仓库现有的 `oxfmt` 和 `oxlint` 工具链。
- 保持仓库的双引号、尾随逗号、PascalCase 类名、camelCase 变量名和 `type` 专用导入风格。
- 新增或生成 TypeScript 代码后，必须同步补充简体中文 JSDoc 注释，覆盖文件职责、导出声明、公开方法及非直观字段；复杂流程可使用简短行内注释，避免逐行重复说明。
- DTO 使用 `class-validator` 完成边界校验；不信任外部请求、第三方 API 返回值或模型工具输出。
- 对可预期的业务与基础设施错误使用 NestJS 异常类；不得静默吞掉异常，或向客户端暴露密钥、堆栈及内部服务细节。
- 禁止在源码或文档示例中硬编码 API Key、JWT 密钥、数据库密码和生产配置；通过现有环境变量读取配置。
- 不创建、配置或使用 `.pnpm-store`；依赖只能安装到项目的 `node_modules` 目录。

## 命名规范

命名以本仓库现有实现为基线；修改既有代码时不主动重命名与当前任务无关的符号。

### 文件与目录

- 源文件使用小写 + 连字符命名，并追加职责后缀：`chat-message.entity.ts`、`weather-tools.factory.ts`、`jwt-auth.guard.ts`。
- 常用后缀：`module`、`controller`、`service`、`entity`、`dto`、`guard`、`strategy`、`filter`、`interceptor`、`decorator`、`types`、`factory`、`registry`、`guardrail`。
- 应用入口仅使用 `main.ts`；目录使用复数小写名词，如 `src/auth`、`src/users`、`src/common/dto`。
- 反例：`ChatMessageEntity.ts`（PascalCase 文件名）、`utils.ts`（无职责后缀的泛化命名）。

### 测试文件

- 单元测试与 e2e 测试分别使用 `*.spec.ts` 与 `*.e2e-spec.ts`，与被测文件同名同目录：`chat.service.spec.ts`、`chat.e2e-spec.ts`。

### 类

- 类名使用 PascalCase，并携带职责后缀：`AuthService`、`ChatController`、`User`、`ChatMessage`。

### 变量

- 变量、函数参数与对象属性使用 camelCase：`conversationId`、`user`。
- 布尔变量使用 `is`、`has`、`can`、`should` 前缀：`isPublic`、`hasError`。
- 禁止单字符变量（循环索引 `i`、`j` 除外）与匈牙利命名（如 `strName`、`arrUsers`）。

### 常量

- 模块级与导出常量使用 UPPER_SNAKE_CASE：`MAX_AGENT_INPUT_LENGTH`、`IS_PUBLIC_KEY`。
- 文案类常量统一以 `_MESSAGE` 结尾：`CONVERSATION_NOT_FOUND_MESSAGE`。
- 不得在业务代码中散落魔法数字或魔法字符串；可复用的字面量应提取为常量。

### 函数与方法

- 函数与方法使用 camelCase 且以动词开头：`findByUsernameWithPassword`、`createConversation`、`sendMessage`。
- 返回布尔值的方法使用 `is`、`has`、`can` 前缀：`hasPermission`。
- 禁止使用下划线前缀（如 `_validate`）或动词后置（如 `validationPerform`）。

### 类型、接口与枚举

- 类型别名与接口使用 PascalCase 名词：`JwtAuthenticatedUser`、`AuthResponse`、`WeatherDay`。
- 非持久化的外部协议、环境变量和 Agent SDK 契约继续优先使用字符串字面量联合类型：`"user" | "assistant"`、`"chat_completions" | "responses"`。
- 持久化字段或直接暴露给 HTTP/Swagger 的业务枚举必须使用显式数字 `enum`，枚举名使用 PascalCase，成员使用 UPPER_SNAKE_CASE；禁止依赖隐式自增值。
- 持久化二值状态统一使用 `0` 表示否、隐藏、未删除或非系统，`1` 表示是、显示、已删除或系统；菜单类型固定为 `DIRECTORY=1`、`PAGE=2`、`BUTTON=3`；聊天消息角色固定为 `USER=1`、`ASSISTANT=2`。
- DTO 对数字枚举使用 `IsEnum` 与整数校验，并在 Swagger 中声明数字枚举和数字示例；服务层、查询条件和默认值必须引用枚举常量，不得散落魔法数字。

### DTO 与 Entity

- DTO 类使用 PascalCase 并追加 `Dto` 后缀：`CreateUserDto`、`LoginDto`。
- Entity 类名使用单数名词（`ChatMessage`），属性使用 camelCase，数据库列名通过 `@Column({ name: "..." })` 显式映射为 snake_case。

### 数据库

- 表名使用 snake_case 复数：`chat_messages`、`users`。
- 列名使用 snake_case；审计字段固定为 `created_at`、`updated_at`、`created_by`、`updated_by`、`deleted_at`。
- 索引名遵循 `IDX_<表名>_<字段列表>`：`IDX_chat_messages_conversation_timeline`。
- 持久化数字枚举使用 PostgreSQL `smallint` 列，设置数字默认值，并通过数据库检查约束限制在声明的枚举值内；不得使用字符串列模拟数字枚举。

### 环境变量

- 环境变量使用 UPPER_SNAKE_CASE，并按模块前缀分组：`APP_*`、`DB_*`、`JWT_*`、`REDIS_*`、`AGENT_LLM_*`、`AGENT_TRACING_*`。

## OpenAI Agents SDK 开发约定

- 保持 Agent 实现、Runner 工厂、领域工具、Guardrails、handoff、注册表和流式服务的职责分离。
- 模型名称、API Key、Base URL、API 模式和 tracing 使用现有 `AGENT_LLM_*` 环境变量配置，不在代码中写死。
- 新增工具必须定义明确的输入 schema、输出类型、错误路径和权限边界；工具只暴露完成任务所需的最小能力。
- 新增或调整 Agent 时，检查输入/输出 Guardrails、异常映射、上下文长度、SSE 事件，以及客户端断开连接后的取消与持久化行为。
- 修改多 Agent 分流或交接逻辑前，必须先阅读下方的 Handoffs 与 Guardrails 官方文档。
- 更新 `@openai/agents` 的用法前，先核对安装版本的类型定义与官方文档，避免假定不存在的 API。

## 开发与验证流程

```bash
# 安装依赖（仅写入项目 node_modules）
pnpm install

# 构建验证
pnpm run build

# 格式检查
pnpm run format:check

# 代码检查；此脚本含 --fix，运行后必须检查 git diff
pnpm run lint
```

- 运行数据库、Redis、认证或 Agent 相关接口前，确认 `.env.development`、PostgreSQL、Redis 和所需的 Agent 环境变量已就绪。
- 执行 `pnpm run lint` 后必须检查 `git diff`，确认没有与当前任务无关的自动修复或格式变更。
- 完成交付前，至少执行与改动相关的构建、格式检查和 lint；若某项未执行，说明原因与风险。

## 参考文档（开发前必读）

### OpenAI Agents SDK

开发、修改或审查 `src/agents`、`src/chat` 中的 Agent 调用、流式传输、工具、Guardrails、handoff、会话或 tracing 前，必须查阅对应专题：

- [OpenAI Agents SDK 中文文档主页](https://openai.github.io/openai-agents-js/zh/)
- [Agents](https://openai.github.io/openai-agents-js/zh/guides/agents)
- [工具](https://openai.github.io/openai-agents-js/zh/guides/tools)
- [Guardrails](https://openai.github.io/openai-agents-js/zh/guides/guardrails)
- [运行 Agent](https://openai.github.io/openai-agents-js/zh/guides/running-agents)
- [流式传输](https://openai.github.io/openai-agents-js/zh/guides/streaming)
- [Handoffs](https://openai.github.io/openai-agents-js/zh/guides/handoffs)
- [会话](https://openai.github.io/openai-agents-js/zh/guides/sessions)
- [Tracing](https://openai.github.io/openai-agents-js/zh/guides/tracing)

### NestJS

开发、修改或审查 NestJS 模块、路由、依赖注入、请求校验、认证、异常处理、响应处理、配置或测试前，必须查阅对应专题：

- [NestJS 官方文档](https://docs.nestjs.com/)
- [Controllers](https://docs.nestjs.com/controllers)
- [Providers](https://docs.nestjs.com/providers)
- [Modules](https://docs.nestjs.com/modules)
- [Pipes](https://docs.nestjs.com/pipes)
- [Guards](https://docs.nestjs.com/guards)
- [Interceptors](https://docs.nestjs.com/interceptors)
- [Exception Filters](https://docs.nestjs.com/exception-filters)
- [Validation](https://docs.nestjs.com/techniques/validation)
- [Configuration](https://docs.nestjs.com/techniques/configuration)
- [Testing](https://docs.nestjs.com/fundamentals/testing)

### 仓库内部参考

- `README.md`：运行方式、环境变量、接口契约与现有行为说明。
- `package.json`：可用脚本与依赖版本。
- `tsconfig.json`：TypeScript 编译约束。
- `.oxfmtrc.json`：格式化配置。
- 相关模块中的 DTO、Entity、Service、Controller、测试与类型定义：改动前后的直接行为依据。
