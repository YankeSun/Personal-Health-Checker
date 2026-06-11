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
- 个人数据导出与账号删除入口，覆盖与账号关联的产品事件
- 30 天体重观察报告内测意向入口

当前不包含支付、订阅消息、设备接入、医疗建议或正式商业化能力；报告入口只记录内测意向。

如果暂时没有真实微信 AppID / AppSecret，可以按 [ENVIRONMENT_READINESS.md](./ENVIRONMENT_READINESS.md) 临时开启内部 mock 登录测试主路径。mock 登录只用于内部测试，正式体验版前必须关闭。

准备发给真实 alpha 用户前，按 [ALPHA_RELEASE_PACK.md](./ALPHA_RELEASE_PACK.md) 整理发放闸门、邀请文案、7 天任务卡、观察记录和复盘指标。

后端主路径可用下面的脚本先验：

```bash
npm run miniprogram:smoke:local
```

这个命令会临时启动本地 Next 服务、开启内部 mock 登录、跑完整小程序后端主路径，并在结束后删除 smoke 账号。

如果 smoke 卡在数据库 health，可以先跑 `npm run db:doctor`；如果需要使用备用数据库变量，可以追加 `--database-url-env DATABASE_URL_UNPOOLED`。

如果已经有 local 或 preview API 在运行，也可以直接指定地址：

```bash
npm run miniprogram:smoke -- --base-url http://localhost:3000
```
