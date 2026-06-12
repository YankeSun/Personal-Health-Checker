# Personal Health Checker Active Objective

更新时间：2026-06-12

## 1. 用途

这份文档是 Codex goal 功能暂时不可用或受限时的替代目标控制台。

它不替代：

- `PRODUCT_ROADMAP_FRAMEWORK.md`
- `PROGRESS_LOG.md`
- `PROJECT_SUMMARY.md`
- `MINIPROGRAM_ALPHA_EXECUTION_BRIEF.md`

它只回答一个问题：**当前这一段执行到底要推进到哪里，下一轮应该先做什么。**

## 2. 当前目标

围绕 Personal Health Checker 完成中国大陆商业化与微信小程序上线前验证方案，并持续推进到可测试版本。

当前更具体地收敛为：

**清零微信小程序 Alpha-001 发放前 P0 blocker，让体验版具备可真机验收、可邀请 10 人 Alpha 的条件。**

## 3. 当前状态

状态：`in_progress`

Codex goal 工具状态：`usageLimited`

因此后续执行不依赖 goal 工具自动续跑，而依赖：

- 本文档记录当前目标
- `PROGRESS_LOG.md` 记录每轮人话进展
- Git commit 记录每轮代码 / 文档变更
- 必要时用 sub-agent 并行审查边界清楚的任务

## 4. 当前硬边界

本阶段继续不做：

- 微信支付
- 订阅消息推送
- 设备接入
- Apple Health / Health Connect
- 原生 App
- 复杂 AI 健康建议
- 医疗诊断、筛查、治疗或风险判断
- 社交社区、排行榜、群打卡
- 新增正式健康指标枚举

本阶段只验证：

- 微信入口是否降低每日记录成本
- 轻体重管理心智是否成立
- 用户是否愿意连续 7 天记录
- Dashboard / Trends 是否产生回看价值
- 30 天体重观察报告是否出现付费意向

## 5. 下一步执行队列

### Step 1. 确认微信账号类型与小程序凭证

目标：确认当前拿到的是小程序 AppID / AppSecret，而不是公众号凭证。

执行：

- 在微信公众平台确认账号类型
- 如果不是小程序，创建或关联小程序
- 获取小程序 AppID / AppSecret
- AppID 可以写入 `miniprogram/project.config.json`
- AppSecret 只能放在本地或 Vercel 环境变量，不能提交到 Git
- 运行 `npm run wechat:credential-probe`

完成条件：

- 明确账号类型
- `WECHAT_MINI_PROGRAM_APP_ID` 和 `WECHAT_MINI_PROGRAM_APP_SECRET` 来源确认
- 没有把 secret 写入仓库

### Step 2. 清零体验版环境 blocker

目标：让体验版远程链路具备发放前检查条件。

执行：

- 配置 Vercel Production 环境变量
- 配置微信 request 合法域名
- 跑 `npm run launch:check:vercel`
- 跑 `npm run miniprogram:check:experience`
- 跑 `npm run alpha:gate:experience -- --batch Alpha-001`

完成条件：

- `Experience build gate` 变成 `GREEN`
- 远程 API、数据库、微信后端凭证、request 域名检查通过

### Step 3. 完成 2 台真机体验版验收

目标：在邀请外部用户前，用真实手机跑通主路径。

执行：

- 微信开发者工具导入 `miniprogram/`
- 上传体验版
- 2 台真机分别完成登录、Today 记录、Dashboard、Trends、我的页、导出 / 删除入口检查
- 私有证据放在已 gitignore 的 `research/alpha/phone-sessions/`

完成条件：

- 2 份真机会话证据完整
- 每份证据包含体验版版本号、真实 AppID、API 域名、Git commit 和主路径结果

### Step 4. 通过 Alpha 邀请闸门

目标：判断是否可以邀请 10 个真实 alpha 用户。

执行：

- 跑 `npm run alpha:invite-gate -- --batch Alpha-001`

完成条件：

- `alpha:invite-gate` 通过
- 仍然没有进入支付、订阅消息、设备接入或新指标开发

## 6. 适合派给 sub-agent 的任务包

后续如果需要并行，只拆这些边界清楚的任务：

- 微信平台配置审查：检查 AppID、request 域名、Vercel env、mock 登录开关，不处理真实 secret。
- 合规上线材料审查：检查隐私、协议、健康免责声明、类目、备案、客服入口占位。
- 当前产品主路径 review：只读审查 Today、Dashboard、Trends、Me 和 API，不直接扩功能。
- 竞品实测整理：基于真实截图、录屏和 notes 补 synthesis，未实测内容只能写待确认。
- Alpha 数据复盘：读取 analytics 和 evidence check，把数字和用户原话整理成 Day 10 判断。

不要让多个 sub-agent 同时修改同一批核心页面。

## 7. 每轮结束标准

每轮实质改动后：

- 更新 `PROGRESS_LOG.md`
- 根据改动范围运行必要检查；代码改动默认跑 `npm test`、`npm run lint`、`npm run build`
- `git commit`
- `git push`

如果只做外部人工配置或只读审查，不需要强行提交空 commit，但需要在回复里说明当前阻塞项和下一步。
