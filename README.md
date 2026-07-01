# Unified NestJS

基于 NestJS、TypeORM 和 PostgreSQL 的后端服务。

## 环境要求

- Node.js
- pnpm
- PostgreSQL

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
| `GET` | `/api/users` | 需认证。查询未删除用户。 |
| `GET` | `/api/users/:id` | 需认证。查询单个未删除用户。 |
| `PATCH` | `/api/users/:id` | 需认证。更新用户名或邮箱。 |
| `DELETE` | `/api/users/:id` | 需认证。软删除用户，记录删除时间，成功时返回 `code: 200`。 |

## 认证接口

认证模块使用 Passport 和 JWT。除认证接口和明确标记公开的接口外，业务接口默认需要 `Authorization: Bearer <token>`。登录字段为 `username` 和 `password`。登出采用无状态 JWT 语义，服务端只返回成功响应，客户端负责删除本地 token。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/auth/login` | 登录，传入 `username`、`password`，成功时 `data` 返回 `accessToken`。 |
| `POST` | `/api/auth/logout` | 退出登录，不撤销服务端 token。 |

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

## 测试与检查

```bash
# 单元测试
pnpm run test

# 端到端测试
pnpm run test:e2e

# 覆盖率
pnpm run test:cov

# Oxlint
pnpm run lint

# 格式检查
pnpm run format:check
```
