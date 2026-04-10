# Health Tracker Web

面向个人用户的 Web 健康追踪器，当前已经完成核心主路径和主要页面：

- Next.js App Router + TypeScript + Tailwind
- Prisma + PostgreSQL schema
- 邮箱密码注册 / 登录 / 退出
- 邮箱验证提醒、忘记密码、重置密码
- HttpOnly Cookie + 服务端 Session
- `/dashboard`、`/today`、`/trends`、`/settings` 受保护
- 设置页支持读取和保存个人资料（昵称、时区、单位、提醒开关）
- 今日记录页支持读取和保存睡眠、体重、饮水的当日手动录入
- 设置页支持读取和保存睡眠、体重、饮水三项目标
- 仪表盘支持展示最近 7 天 / 30 天摘要、达标率、今日状态和连续记录天数
- 历史趋势页支持三项指标切换、7 天 / 30 天折线图和趋势摘要
- Today 和 Dashboard 已接入基于规则的站内提醒
- 已提供 `/api/records` 范围查询接口，方便后续历史页调试和扩展
- 已提供无需登录的 `/experience` 访客体验页，可直接浏览核心界面

## Quick Start

1. 复制环境变量

```bash
cp .env.example .env
```

2. 启动 PostgreSQL

```bash
docker compose up -d
```

3. 安装依赖并生成 Prisma Client

```bash
npm install
npm run prisma:generate
```

4. 推送数据库结构并启动开发服务器

```bash
npm run prisma:push
npm run prisma:seed
npm run dev
```

5. 运行测试

```bash
npm test
npm run smoke
npm run analytics:report -- --days=30
```

本地启动后，可以直接打开：

- `http://localhost:3000/` 查看产品首页
- `http://localhost:3000/experience` 进入无需登录的访客体验

## Demo Seed

运行 `npm run prisma:seed` 后，会生成一个演示账号：

- 邮箱：`demo@healthtracker.local`
- 密码：`DemoHealth123`

这份种子数据会创建：

- 1 个默认用户和资料偏好
- 睡眠 / 体重 / 饮水三项目标
- 最近 30 天的演示记录
- 故意留出今天未补齐的饮水数据，方便直接看到提醒卡片和达标压力

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/profile`
- `PATCH /api/profile`
- `GET /api/goals`
- `PUT /api/goals`
- `GET /api/records/today`
- `PUT /api/records/today`
- `GET /api/records?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/dashboard?days=7|30`
- `GET /api/trends?metric=sleep|weight|water&days=7|30`

## Deployment

推荐部署组合：

- 前端和 API：Vercel
- 数据库：Neon PostgreSQL
- 邮件发送：Resend（可选，但建议用于邮箱验证和密码重置）

最小部署步骤：

1. 在 Neon 创建数据库，拿到连接串后填入 `DATABASE_URL`
2. 在 Vercel 导入仓库，并配置环境变量：
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `EMAIL_FROM`
   - `RESEND_API_KEY`
3. 首次部署前执行一次数据库结构同步：

```bash
npm run prisma:push
```

4. 如果需要演示环境，再执行一次：

```bash
npm run prisma:seed
```

项目已经加了 `postinstall` 自动执行 `prisma generate`，适合直接部署到 Vercel。

如果暂时没有配置 `EMAIL_FROM` 和 `RESEND_API_KEY`，账号安全流程仍会创建验证 / 重置令牌，但邮件只会走服务端 fallback 日志，不会真正发送到用户邮箱。

如果你要从本地继续发到同一个 Vercel 项目，并且给每次 deployment 留下简短说明，可以用：

```bash
npm run deploy:preview -- "这次版本相比上一个版本的改动说明"
```

正式发布则用：

```bash
npm run deploy:prod -- "这次版本相比上一个版本的改动说明"
```

每次部署后，说明会同步追加到 [DEPLOYMENTS.md](./DEPLOYMENTS.md)。

## Progress Notes

- 开发推进日志见 [PROGRESS_LOG.md](./PROGRESS_LOG.md)
- 项目整体总结见 [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

## CI

仓库已经补了 GitHub Actions 工作流：

- 文件位置：`.github/workflows/ci.yml`
- 执行内容：`prisma generate`、`lint`、`test`、`build`

如果你把项目推到 GitHub，这套 CI 会在 `push` 和 `pull_request` 时自动跑起来，先帮你守住回归风险。

## Smoke Checklist

上线前建议至少手动过一遍这几个路径：

1. 未登录访问 `/dashboard`、`/today`、`/trends`、`/settings`，应跳到 `/login`
2. `/login` 和 `/register` 页面能正常渲染表单
3. 演示账号登录后，`Today`、`Dashboard`、`Trends`、`Settings` 都能打开
4. 修改一条今日记录后，仪表盘与趋势页能看到变化
5. 关闭提醒开关后，Today 和 Dashboard 的提醒模块会切成关闭状态

如果你只是想快速检查未登录主路径，可以在本地起服务后直接运行：

```bash
npm run smoke
```
