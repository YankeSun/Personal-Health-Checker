# Personal Health Checker 小程序 Alpha 执行简报

更新时间：2026-06-12

这份文档是给没有上下文的 agent / 开发者看的短交接材料。它不替代 `PRODUCT_ROADMAP_FRAMEWORK.md`、`PROGRESS_LOG.md`、`WECHAT_MINI_PROGRAM_VALIDATION_PLAN.md`，而是把当前最短执行路径压成一页操作判断。

## 1. 当前阶段判断

当前项目处在：

**微信小程序 Alpha 发放前配置与验收阶段。**

不要把它描述成：

- 已完成商业化
- 已完成小程序正式上线
- 已完成微信竞品实测
- 已经证明用户愿意付费

当前 Web 主路径已经具备稳定记录、趋势回看、目标、提醒、上下文标签、账号安全、基础合规和埋点能力。小程序端已经具备 Alpha 壳：登录、Today 记录、Dashboard、体重趋势、我的页、反馈、30 天观察报告意向、导出和删除入口。

但真实 Alpha 还没有开始，因为微信真实 AppID、AppSecret、Vercel 生产环境变量、request 合法域名、数据库可达性、真机验收和真实用户证据尚未全部清零。

## 2. 本阶段硬边界

本阶段继续不做：

- 微信支付
- 订阅消息推送
- 设备接入
- Apple Health / Health Connect
- 原生 App
- 完整饮食库、热量系统、拍照识别
- 复杂 AI 健康建议
- 医疗诊断、筛查、治疗或风险判断
- 社交社区、排行榜、群打卡
- 新增正式健康指标枚举

当前只验证：

- 微信入口是否降低每日记录成本
- 轻体重管理心智是否成立
- 用户是否愿意连续 7 天记录
- Dashboard / Trends 是否产生回看价值
- 30 天体重观察报告是否出现付费意向

## 3. 当前已完成能力

Web 端已经可体验：

- 邮箱注册、登录、登出、邮箱验证提示、忘记密码和重置密码路径
- Today：睡眠、体重、饮水、体重背景标签、补录、质量提示、最近值快填、保存后去 Dashboard
- Dashboard：今日完成度、连续记录、达标率、体重变化线索、行动洞察、报告内测意向
- Trends / History：7 / 30 天趋势、补录标记、目标线、波动洞察、月度小结、导出
- Settings：资料偏好、单位、提醒开关、三项目标
- Legal：隐私保护指引、用户协议、健康免责声明
- API：账号导出、账号删除、反馈、付费意向、健康检查
- Analytics：Web usage report 和小程序 alpha report

小程序 Alpha 壳已经具备：

- 登录前协议确认
- `wx.login` 到服务端 Bearer token 的技术路径
- Today 体重优先记录
- 简版 Dashboard
- 体重趋势页
- 我的页 7 天任务、报告意向、Alpha 反馈、导出、删除、协议入口

这些是 Alpha 验证入口，不是正式双端产品完成。

## 4. 当前 P0 Blockers

这些 blocker 未清零前，不要邀请外部用户：

- `miniprogram/project.config.json` 仍需替换成真实微信小程序 AppID
- 本地和 Vercel Production 需要配置 `WECHAT_MINI_PROGRAM_APP_ID`
- 本地和 Vercel Production 需要配置 `WECHAT_MINI_PROGRAM_APP_SECRET`
- Vercel Production 需要确认 `DATABASE_URL`、`SESSION_SECRET`、邮件相关环境变量
- 当前数据库连接在本地 readiness 中仍可能超时，需要先跑 `npm run db:doctor -- --timeout-ms 5000`
- 如果远程数据库网络不可达，可以用 `npm run miniprogram:smoke:docker` 先验证本地小程序主路径
- 微信公众平台需要配置 request 合法域名，且与 `miniprogram/src/config.js` 的 `apiBaseUrl` 一致
- 微信公众平台隐私保护指引、类目、备案、客服入口仍需人工确认
- 微信开发者工具需要导入 `miniprogram/`，上传体验版
- 至少 2 台真机要跑通登录、记录、Dashboard、Trends、我的页、导出 / 删除，并留下私有证据
- `npm run alpha:readiness` 顶部的 `Experience build gate` 必须为 `GREEN`

## 5. 竞品实测状态

当前竞品研究还不能当作“已完成微信小程序竞品结论”。

已经具备：

- 公开资料预调研
- 8 类微信竞品样本框架
- 评分维度
- 单样本记录模板
- 证据目录规范
- synthesis 模板

仍必须真机采集：

- 微信搜索结果截图
- 首次打开录屏
- 一次核心记录录屏
- 提醒 / 分享 / 会员 / 付费入口截图
- 授权、登录、隐私、订阅消息和支付入口摩擦
- 微信内真实首屏心智、记录步数、回看价值和商业入口

最小样本：至少 8 个微信内真实样本，覆盖体重记录、减肥打卡、饮食热量、喝水提醒、睡眠记录、习惯打卡、智能硬件、综合健康 / AI 健康。

没有截图、录屏和 notes 时，只能写“待真机确认”，不能写成已验证事实。

## 6. 未来 7 天最短路径

| 时间 | 目标 | 代码任务 | 人工 / 外部配置任务 |
|---|---|---|---|
| Day 0 | 清零体验版 P0 配置 blocker | 跑 `alpha:readiness`、`launch:check:*`、`miniprogram:check:*`，只修检查暴露出的真实问题 | 配 AppID / AppSecret、Vercel env、request 域名、隐私配置、类目 / 备案 / 客服入口 |
| Day 1 | 体验版可测 | 只修登录、保存、Dashboard、Trends、我的页主路径 bug | 微信开发者工具导入、上传体验版、2 台真机完整验收并留证据 |
| Day 2 | 发 10 人 Alpha | 不加新功能，只修 P0 崩溃或保存失败 | 邀请 10 个有体重管理动机的人，记录来源、设备、首次登录和首次记录 |
| Day 3 | 判断首次回访 | 如漏斗缺事件，只补最小埋点 | 跟踪次日是否回来、是否完成体重记录、是否看 Dashboard |
| Day 4-5 | 判断回看价值 | 只修明显误导、空状态、错误态 | 收集 Dashboard / Trends 是否被打开，以及“最有用 / 最卡”的原话 |
| Day 6 | 判断付费意向 | 确认报告意向点击被记录 | 提醒第 7 天提交 Alpha 反馈，可点击 30 天报告内测但不收费 |
| Day 7 | 初步决策 | 跑 `analytics:miniprogram`，失败则先定位数据库 | 汇总 10 人 7 天记录、反馈率、访谈摘要，判断 `needs_data / hold_and_improve / beta_candidate` |

## 7. 只允许再做 3 个代码改动时

优先顺序如下：

1. 小程序真机错误态、重试和诊断强化：优先覆盖登录失败、保存失败、Dashboard / Trends 加载失败、API health 不通。
2. Alpha analytics 决策报告收紧：报告直接输出各门槛是否达标、缺失证据和 `needs_data / hold_and_improve / beta_candidate`。
3. 体验版 readiness 单一红绿灯：把 AppID、mock 开关、远程 `/api/health`、数据库、Vercel env、request 域名、合规入口集中成一个发放前 gate。

## 8. 每轮执行前读什么

默认顺序：

1. `PRODUCT_ROADMAP_FRAMEWORK.md`
2. `PROGRESS_LOG.md`
3. `PROJECT_SUMMARY.md`
4. `WECHAT_MINI_PROGRAM_VALIDATION_PLAN.md`
5. 本文件
6. `miniprogram/ALPHA_RELEASE_PACK.md`
7. `research/alpha/ALPHA_BATCH_CONTROL.md`
8. `research/WECHAT_COMPETITOR_FIELDWORK.md`

每轮执行后：

- 更新 `PROGRESS_LOG.md`
- 跑必要检查
- `git commit`
- `git push`
