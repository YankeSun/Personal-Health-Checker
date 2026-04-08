# Deployment Notes

每次发到 Vercel 的版本都在这里补一条简短说明，方便和 Deployments 列表对应起来。

## 2026-04-07 15:38:06 CST · Preview

- URL: https://health-tracker-ms4kj2m4x-yankesuns-projects.vercel.app
- Compared with previous deployment: 统一保留站内滚动位置，切换睡眠/趋势/日期/历史记录时不再回到页面顶部；新增部署记录机制，后续每次部署都会同步留下简短变更说明。

## 2026-04-07 15:48:13 CST · Preview

- URL: https://health-tracker-j1tnd3iy2-yankesuns-projects.vercel.app
- Compared with previous deployment: 移除 /experience 中带有导览和访客模式意味的说明文案，统一改成正式产品口径；强化可点击入口的视觉层级，让登录与页面切换入口明显区别于纯信息卡片。

## 2026-04-07 16:18:26 CST · Production

- URL: https://health-tracker-p61p7pe0y-yankesuns-projects.vercel.app
- Compared with previous deployment: 接入 Neon 数据库并切换到 Postgres 适配器；补上自动建表逻辑，修复线上注册/登录因缺失数据库环境和空库导致的失败。

## 2026-04-07 16:25:54 CST · Preview

- URL: https://health-tracker-l5awe9z27-yankesuns-projects.vercel.app
- Compared with previous deployment: 统一前端接口错误提示；预览保护或非 JSON 返回时展示清晰说明，不再只显示笼统的网络异常。

## 2026-04-07 16:53:33 CST · Preview

- URL: https://health-tracker-403pehko3-yankesuns-projects.vercel.app
- Compared with previous deployment: 移除底部三张说明卡；把产品引导收进首屏右侧，改成更图形化的核心记录与使用节奏展示，减少解释型文案。

## 2026-04-08 14:51:56 CST · Preview

- URL: https://health-tracker-kbuitpt9z-yankesuns-projects.vercel.app
- Compared with previous deployment: 基于已推送到 GitHub 的 main 分支重新部署；包含入口页文案收紧与更成熟的产品表达。
