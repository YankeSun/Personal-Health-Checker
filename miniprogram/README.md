# Personal Health Checker 小程序 Alpha 壳

这个目录是微信小程序最小前端壳，用于内测验证“微信入口是否降低每日记录成本”。

## 使用方式

1. 打开微信开发者工具。
2. 导入项目目录：`miniprogram/`。
3. 在 `src/config.js` 中把 `apiBaseUrl` 改成当前 Vercel API 域名。
4. 在微信公众平台后台配置 request 合法域名。
5. 使用体验版 AppID 时，后端需要配置 `WECHAT_MINI_PROGRAM_APP_ID` 和 `WECHAT_MINI_PROGRAM_APP_SECRET`。

## 当前范围

- 微信登录并换取服务端 Bearer token
- 今日记录：睡眠、体重、饮水、体重背景标签
- 简版 Dashboard
- 体重趋势
- 我的 / 设置摘要
- 个人数据导出与账号删除入口
- 30 天体重观察报告内测意向入口

当前不包含支付、订阅消息、设备接入、医疗建议或正式商业化能力；报告入口只记录内测意向。
