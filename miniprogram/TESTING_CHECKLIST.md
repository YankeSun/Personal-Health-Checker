# Personal Health Checker 小程序 Alpha 测试清单

这份清单用于把 `miniprogram/` 从“代码能导入”推进到“可以发体验版找人试用”。

当前小程序仍是 alpha 内测壳，只验证微信入口、每日记录、回看和轻付费意向，不验证正式支付、订阅消息、设备接入或医疗健康服务。

如果准备发给 10-30 个真实测试用户，先按 [ALPHA_RELEASE_PACK.md](./ALPHA_RELEASE_PACK.md) 完成发放闸门、邀请文案、7 天任务卡、观察记录和复盘指标。

## 1. 自动自检

每次准备导入微信开发者工具前先运行：

```bash
npm run launch:check
npm run miniprogram:check
```

这会检查：

- `project.config.json` 和 `app.json` 是否完整
- 登录、记录、Dashboard、趋势、我的、协议页是否都有 `js/json/wxml/wxss`
- tabBar 是否只暴露记录、概览、趋势、我的
- `apiBaseUrl` 是否是 HTTPS
- Bearer token、协议确认、账号导出/删除、付费意向入口是否仍存在
- 内部 mock 登录按钮是否默认关闭

准备体验版前再运行：

```bash
npm run launch:check:strict
npm run miniprogram:check:strict
```

严格模式还会检查：

- `project.config.json` 是否已经从 `touristappid` 改成真实 AppID
- 后端环境变量是否有 `WECHAT_MINI_PROGRAM_APP_ID`
- 后端环境变量是否有 `WECHAT_MINI_PROGRAM_APP_SECRET`

如果要检查 Vercel Production 环境变量名称是否齐全：

```bash
npm run launch:check:vercel
```

如果要检查线上 API 是否真的可访问，再运行：

```bash
npm run miniprogram:check:remote
```

这会访问 `src/config.js` 中的 `apiBaseUrl`，并请求 `/api/health` 检查：

- API 是否返回健康状态
- 数据库是否可连接
- 严格模式下，微信小程序后端密钥是否已在远端配置

如果还没有真实微信 AppID / AppSecret，但已经在 local 或 preview 环境显式开启 mock 登录，可以跑小程序主路径 smoke：

```bash
npm run miniprogram:smoke:local
```

它会自动启动本地服务、临时开启 mock 登录、跑主路径并默认清理 smoke 账号。

如果已经有后端服务在运行，也可以指定地址：

```bash
npm run miniprogram:smoke -- --base-url http://localhost:3000
```

这会用 `mock:alpha-smoke` 登录，并依次验证今日记录保存、Dashboard、体重趋势、资料/目标、账号导出和报告内测意向接口。

第一批真实测试用户回来后，跑小程序 alpha 指标报告：

```bash
npm run analytics:miniprogram -- --days=30
```

报告会输出次日回访率、7 日平均记录天数、体重填写率、上下文标签填写率、Dashboard / Trends 使用率、付费意愿点击率、alpha 反馈提交率和 `decision`。`continue_candidate` 只代表数据达标，仍需要反馈文本能说明产品价值后再规划 beta。

## 2. 微信后台准备

在微信公众平台确认：

- 小程序 AppID 与 `miniprogram/project.config.json` 一致
- 小程序已完成必要备案
- request 合法域名已配置为当前 Vercel API 域名
- 隐私保护指引已按产品内实际收集项填写
- 类目选择保持低风险工具 / 健康管理方向，不表达医疗诊断能力

## 3. 开发者工具导入

1. 打开微信开发者工具。
2. 导入目录：`miniprogram/`。
3. 确认 `miniprogramRoot` 为 `src/`。
4. 确认 `src/config.js` 的 `apiBaseUrl` 指向当前线上 API。
5. 编译项目，确认控制台没有 WXML、JS 或网络域名错误。

## 4. 主路径手动验收

### 登录与协议

- 未勾选协议时点击“微信登录并开始记录”，应停留在登录页并提示先同意协议。
- 点击隐私保护指引、用户协议、健康免责声明，应进入对应说明。
- 勾选协议后微信登录，应进入今日记录页。
- 如果暂时没有真实微信 AppID / AppSecret，可按 [ENVIRONMENT_READINESS.md](./ENVIRONMENT_READINESS.md) 临时开启内部 mock 登录测试主路径；正式体验版前必须关闭。
- 如果只想先验证后端主路径，可在 mock 环境跑 `npm run miniprogram:smoke`。

### 今日记录

- 可以填写睡眠、体重、饮水。
- 首屏应先看到今日称重、完成进度和下一步提示。
- 可以选择体重背景标签。
- 如果输入明显异常的体重、睡眠或饮水，保存后应展示温和确认提示。
- 保存后应有明确成功反馈。
- 保存成功后应出现“看今日概览”入口。
- 重新进入今日记录页，应能回显刚保存的数据。

### Dashboard

- 登录后可以进入“概览”。
- 顶部应显示今天先做什么，并能点击回到最相关页面。
- 体重变化线索应展示最近体重、变化幅度、记录天数和常见背景标签。
- 今日状态、最近摘要和提醒应能正常显示。
- 网络或登录失效时，应回到登录页。

### 趋势

- 可以进入“趋势”。
- 顶部应展示体重趋势结论，而不只是数字。
- 最近走势应能用轻量趋势条展示记录 / 缺失 / 补录差异。
- 周期对比应说明相比上一周期是明显变化、基本接近还是待积累。
- 体重背景应展示常见背景标签，并说明它们只是回看线索。
- 体重趋势能展示最近记录。
- 没有足够数据时，应显示可理解的空状态。

### 我的

- 应显示 7 天测试任务，并能跳转到记录、概览、趋势和反馈。
- 可以查看资料和目标摘要。
- 可以查看协议与说明。
- 可以点击“加入报告内测”，只记录意向，不进入支付；页面应明确展示当前是 waitlist / 内测意向。
- 可以提交 Alpha 反馈，反馈包含评分、最有用的点、最卡的点和一句话说明。
- 提交 Alpha 反馈后，选择状态和文本应被清空，避免重复提交误判。
- 可以触发个人数据导出，导出内容包含记录、目标、微信身份映射和与账号关联的产品事件。
- 删除账号前必须出现二次确认。

## 5. 测试证据记录模板

每次体验版测试至少记录：

可以先运行 `npm run alpha:phone-session -- --batch Alpha-001 --tester internal-01` 生成会话记录文件，再补截图 / 录屏证据。

| 项目 | 内容 |
|---|---|
| 测试日期 |  |
| 小程序 AppID |  |
| API 域名 |  |
| Git commit |  |
| 测试设备 |  |
| 微信版本 |  |
| 登录是否通过 | 是 / 否 |
| 今日记录是否通过 | 是 / 否 |
| Dashboard 是否通过 | 是 / 否 |
| 趋势是否通过 | 是 / 否 |
| 我的页是否通过 | 是 / 否 |
| 协议与说明是否可访问 | 是 / 否 |
| 数据导出是否通过 | 是 / 否 |
| Alpha 反馈是否提交 | 是 / 否 |
| 删除账号是否通过 | 是 / 否 |
| 发现的问题 |  |
| 是否可以发给外部测试用户 | 是 / 否 |
| 30 天 alpha report decision | needs_data / hold_and_improve / continue_candidate |

## 6. 不通过时先看哪里

- 登录失败：检查 `WECHAT_MINI_PROGRAM_APP_ID`、`WECHAT_MINI_PROGRAM_APP_SECRET`、request 合法域名。
- 网络失败：检查 `src/config.js` 的 `apiBaseUrl`、`npm run miniprogram:check:remote` 输出和 Vercel 部署状态。
- 保存失败：检查后端数据库连接和 Bearer token 是否传入。
- 协议页打不开：检查 `app.json` 是否包含 `pages/legal/legal`。
- 趋势无数据：先完成一次今日记录，再重新进入趋势页。
