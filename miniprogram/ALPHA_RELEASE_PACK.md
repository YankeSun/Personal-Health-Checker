# Personal Health Checker 小程序 Alpha 发放包

这份文档用于把体验版从“研发自测通过”推进到“可以发给 10-30 个真实用户试用”。

当前 alpha 只验证：

- 微信入口是否降低每日记录成本
- 轻体重管理心智是否成立
- `Today -> Dashboard -> Trends -> 我的` 这条路径是否能让用户愿意连续 7 天回来
- 30 天体重观察报告是否出现轻付费意向

当前 alpha 不验证：

- 正式支付
- 订阅消息
- 设备接入
- AI 健康建议
- 医疗诊断、治疗或风险筛查

---

## 1. 发放前闸门

下面这些项未通过前，不建议发给外部测试用户。

### 1.1 自动检查

先跑总览，确认当前 blocker 集中在哪里：

```bash
npm run alpha:readiness
```

如果 `launch:check` 输出了 `Next actions`，先按动作清单处理 AppID、Vercel env、request 合法域名、mock 开关和发放材料，再进入严格闸门。

再按发放前严格闸门逐项清零：

```bash
npm run launch:check:strict
npm run launch:check:vercel
npm run miniprogram:check:strict
npm run miniprogram:check:remote
```

必须通过：

- 真实小程序 AppID 已写入 `miniprogram/project.config.json`
- Vercel Production 已配置 `DATABASE_URL`
- Vercel Production 已配置 `SESSION_SECRET`
- Vercel Production 已配置 `WECHAT_MINI_PROGRAM_APP_ID`
- Vercel Production 已配置 `WECHAT_MINI_PROGRAM_APP_SECRET`
- Production 未开启 `WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED=true`
- `apiBaseUrl` 可访问 `/api/health`
- 数据库连接正常
- 小程序页面结构、Bearer token、协议入口、导出/删除、报告意向和 alpha 反馈入口均存在

### 1.2 人工检查

- 微信公众平台 request 合法域名已配置为当前 Vercel API 域名
- 微信公众平台隐私保护指引已按实际收集项填写
- 类目、备案、客服入口和审核说明已确认
- 微信开发者工具可导入 `miniprogram/` 并成功编译
- 已上传体验版
- 至少 2 台真机完成 [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) 的主路径验收
- 记录当前 Git commit、API 域名、测试设备和微信版本
- 用 `research/alpha/PHONE_TEST_SESSION_TEMPLATE.md` 记录至少 2 台真机测试过程

### 1.3 不要发放的情况

- 仍使用 `touristappid`
- 仍依赖 mock 登录
- 真机登录失败
- 保存今日记录失败
- Dashboard 或 Trends 无法打开
- 协议页打不开
- 账号删除没有二次确认
- 隐私保护指引、用户协议或健康免责声明仍缺主体信息

---

## 2. 测试用户选择

第一批建议 10-30 人，不要一开始公开扩散。

优先邀请：

- 正在关注体重管理、减脂、维持体重或称重习惯的人
- 愿意连续 7 天每天花 1 分钟记录
- 愿意说出为什么回来或为什么离开
- 可以接受产品仍是 alpha，不是正式健康服务

暂不优先邀请：

- 需要医疗建议、诊断或治疗方案的人
- 主要诉求是食物热量库、运动课程、设备同步的人
- 不愿意授权微信体验版或不愿意反馈的人

---

## 3. 可直接发送的邀请文案

```text
我在做一个微信小程序 alpha，方向是“轻体重管理记录”。

它不是医疗产品，也不会给诊断或治疗建议。现在只想验证一件事：
每天记录体重、睡眠、饮水和一点日常背景，是否能帮助你更容易理解体重变化，并愿意连续用 7 天。

测试任务很轻：
1. 连续 7 天，每天打开一次小程序。
2. 在“记录”里填今天体重，睡眠和饮水能填就填。
3. 看一下“概览”和“趋势”，判断它有没有让你更清楚今天/这周该关注什么。
4. 第 7 天在“我的”页提交 Alpha 反馈。

当前不会收费；“30 天体重观察报告”只是内测意向入口，不会进入支付。
如果你不想继续，可以随时停止，也可以在“我的”页导出数据或删除账号。
```

---

## 4. 用户 7 天任务卡

### Day 1：首次开始

- 勾选协议并完成微信登录
- 在“记录”页填写体重
- 尽量补充睡眠、饮水和体重背景
- 保存后点击“看今日概览”
- 看 Dashboard 顶部是否知道下一步该做什么
- 到“我的”页看一眼 7 天测试任务

### Day 2-3：形成节奏

- 每天完成一次体重记录
- 如果忘记睡眠或饮水，可以只先保存体重
- 看 Dashboard 的“体重变化线索”
- Trends 如果数据还少，只观察空状态和提示是否清楚

### Day 4-6：观察回看价值

- 继续每天记录体重
- 尽量选择饮食状态、活动量或称重时段
- 看 Trends 的趋势结论、最近走势和体重背景
- 注意自己是否能理解体重波动，不要求得出原因

### Day 7：提交反馈

- 完成当天记录
- 看 Dashboard 和 Trends
- 如果对 30 天报告感兴趣，点击“加入报告内测”
- 在“我的”页提交 Alpha 反馈
- 反馈重点：是否愿意明天继续打开，最有用和最卡的地方是什么

---

## 5. 观察记录表

每个测试用户建议记录以下信息：

建议同步填写 `research/alpha/ALPHA_USER_EVIDENCE.md`，把用户原话和 7 天行为证据留在同一处。

每一批体验版还要同步更新 `research/alpha/ALPHA_BATCH_CONTROL.md`，确保 Git commit、API 域名、体验版版本号、真机验收和复盘指标都能对应到同一个批次。

| 字段 | 记录内容 |
|---|---|
| 用户编号 | U001 / U002 / ... |
| 来源 | 朋友 / 社群 / 同事 / 其他 |
| 体重管理动机 | 减脂 / 维持 / 增肌 / 健康观察 / 其他 |
| 是否完成首次登录 | 是 / 否 |
| 是否完成首次体重记录 | 是 / 否 |
| 第 2 天是否回来 | 是 / 否 |
| 7 天内记录天数 | 0-7 |
| 是否填写背景标签 | 是 / 否 |
| 是否看过 Dashboard | 是 / 否 |
| 是否看过 Trends | 是 / 否 |
| 是否点击报告内测 | 是 / 否 |
| 是否提交 Alpha 反馈 | 是 / 否 |
| 最有用的点 | 用户原话 |
| 最卡的点 | 用户原话 |
| 是否愿意继续 30 天 | 是 / 否 / 不确定 |
| 备注 |  |

---

## 6. 访谈问题

测试结束后，优先问这些问题：

1. 你第一次打开时，知道自己应该先做什么吗？
2. 记录体重这件事是否足够快？哪里最麻烦？
3. Dashboard 有没有帮你理解“今天先看什么”？
4. Trends 有没有帮你理解体重变化？哪些内容没看懂？
5. 睡眠和饮水对你来说是有帮助的辅助信息，还是多余负担？
6. 背景标签是否有用？哪些标签应该删掉或补充？
7. 你会不会愿意连续用 30 天？为什么？
8. 如果 30 天体重观察报告成为付费权益，你希望它包含什么？
9. 如果你不愿意继续用，主要原因是什么？
10. 你会把它推荐给什么样的人？

---

## 7. 数据复盘

第一批测试结束后运行：

```bash
npm run analytics:miniprogram -- --days=30
```

需要一起看：

- `alphaUsers`
- `firstCompleteRecordRate`
- `nextDayReturnRate`
- `averageRecordDaysInFirst7Days`
- `weightRecordRate`
- `contextTagRate`
- `dashboardViewRate`
- `trendsViewRate`
- `payIntentRate`
- `feedbackRate`
- `decision`

继续进入 beta 规划的最低候选信号：

- 次日回访率 >= 25%
- 7 日内平均记录天数 >= 3
- 体重记录率 >= 50%
- 背景标签填写率 >= 40%
- 付费意愿点击率 >= 5%
- Alpha 反馈提交率 >= 30%
- 用户能用自己的话复述价值：更容易坚持称重、更容易理解波动、更清楚目标进度

如果量化数据达到 `continue_candidate`，仍不能直接商业化；还需要结合用户原话和真机测试证据判断。

---

## 8. 发放批次记录

每一批体验版都记录一次：

正式记录以 `research/alpha/ALPHA_BATCH_CONTROL.md` 为准；下面的表可以作为发放包内的快速摘要。

| 字段 | 内容 |
|---|---|
| 发放批次 | Alpha-001 |
| 发放日期 |  |
| Git commit |  |
| API 域名 |  |
| 小程序 AppID |  |
| 体验版版本号 |  |
| 测试人数 |  |
| 邀请渠道 |  |
| 是否完成真机验收 | 是 / 否 |
| 是否跑过 `analytics:miniprogram` | 是 / 否 |
| 本批结论 | 继续观察 / 先优化 / 暂停扩大发放 |
| 主要问题 |  |
| 下一批要改什么 |  |
