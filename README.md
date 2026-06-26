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
| `DB_HOST` | PostgreSQL 主机地址 | 是 |
| `DB_PORT` | PostgreSQL 端口 | 是 |
| `DB_USER` | PostgreSQL 用户名 | 是 |
| `DB_PASSWORD` | PostgreSQL 密码 | 是 |
| `DB_DATABASE` | 应用连接的数据库名称 | 是 |
| `DB_NAME` | 预留字段 | 否 |

数据库连接由 TypeORM 在应用启动时建立。连接配置关闭 `synchronize` 与自动执行迁移，因此不会自动创建或修改数据库表结构。

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

默认 HTTP 端口为 `3000`，可通过 `PORT` 环境变量覆盖。

## 测试与检查

```bash
# 单元测试
pnpm run test

# 端到端测试
pnpm run test:e2e

# 覆盖率
pnpm run test:cov

# ESLint
pnpm exec eslint 'src/**/*.ts'
```
