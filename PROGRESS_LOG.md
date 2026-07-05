# Project Progress Log

这份文档既是**简短推进日志**，也是给"没有任何上下文的 coding agent"看的**最小接手入口**。

目标是让一个新 agent 只读这一份文档，也能快速回答下面 4 个问题：

1. 这是什么项目
2. 当前阶段该做什么，不该做什么
3. 现在已经做到哪里了
4. 下一步默认应该推进什么

如果需要更细的背景，再读：

- [PRODUCT_ROADMAP_FRAMEWORK.md](./PRODUCT_ROADMAP_FRAMEWORK.md)
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

---

## 1. 项目是什么

`Personal Health Checker` 是一个面向个人用户的 Web 健康追踪器。

当前版本的核心定位是：

- 帮用户低门槛开始记录
- 聚焦睡眠、体重、饮水 3 项核心指标
- 用 Today、Dashboard、Trends、History 这几条主路径帮助用户持续记录和回看变化

它**不是**：

- 医疗诊断产品
- 大而全的健康数据平台
- 社交产品
- AI 健康建议产品
- 穿戴设备整合平台

当前主线是：**先把持续记录、账号安全、数据可信度和轻量回看价值打稳**。

---

## 2. 当前战略边界

新 agent 开工前必须先检查：当前任务有没有偏离这些边界。

### 2.1 当前明确不做

- 不做医疗诊断
- 不做复杂 AI 健康建议
- 不做社交/community
- 不做过重的设备接入
- 不为了"看起来完整"继续堆更多健康指标

### 2.2 当前优先做

- 提升持续记录概率
- 提升记录主路径顺滑度
- 提升数据可信度
- 提升 Dashboard / Trends 的实际回看价值
- 建立基础漏斗和留存观察能力

---

## 3. 当前阶段

当前已经从"能演示"推进到"能稳定使用"的中后段，正处在：

- **阶段 A 已完成**
- **阶段 B 已推进到回看价值增强**
- **阶段 C 核心首轮能力已完成**：C1 数据可信度、C2 目标系统表达、C3 轻量观察能力均已落地

### 阶段 A 已完成

- `A1` 账号安全闭环
  - 邮件验证
  - 忘记密码
  - 重置密码
  - 更清晰的登录/注册异常反馈
- `A2` 关键路径体验收紧
  - 注册后直接进入 Today
  - 首次记录路径更短
- `A3` Today 页记录效率优化
  - 完成进度
  - 缺失提示
  - 快速填充最近值
  - 更明确的完成反馈
- `A4` 基础埋点与漏斗观察
  - 注册埋点
  - 登录埋点
  - 记录保存埋点
  - 首次记录 / 首次完整记录埋点
  - 核心页面访问埋点
  - 内部可跑的观察报表脚本

### 阶段 C 已完成

- `C1` 提升数据可信度
  - DailyRecord 持久化补录标记 `isBackfilled`
  - Today 页对明显异常值做温和提示（record-quality）
  - History / Trends 原始记录视图区分补录和当日记录
  - 趋势图用空心圆区分补录记录，tooltip 显示真实单位
- `C2` 优化目标系统表达
  - 用行为化按钮替代抽象下拉框（如"每天至少睡够"、"保持在这个区间"）
  - 为每个指标推荐最适合的模式
  - 设置页直接说明"系统会怎样判断达标"
  - Dashboard / Trends / Reminder 统一使用同一套目标语言
  - Today 页输入过程中实时显示目标反馈
- `C3` 增加轻量观察能力
  - 趋势洞察新增指标波动检测（标准差超过阈值时提示）
  - Dashboard 新增"最近 30 天变化小结"洞察
  - Dashboard 和 Trends 显示目标偏差方向和幅度
  - History 页新增月度小结（记录密度对比、最容易漏记的指标）

### 下一步默认主线

如果用户没有额外改方向，默认应该继续推进：

1. **继续优化 Today 记录路径的顺滑度**
2. **增强提醒系统的行为设计**
3. **评估是否需要进入阶段 D（载体扩展 / 商业化）**

默认不要跳去做：

- 原生 App
- Apple Health / Health Connect
- 商业化支付
- 复杂 AI
- 新指标扩张

---

## 4. 当前已经有的核心能力

### 4.1 账号

- 注册
- 登录
- 退出
- Session + HttpOnly Cookie
- 小程序 Bearer Session 基础入口
- 邮件验证提示
- 忘记密码 / 重置密码

### 4.2 用户资料与目标

- 昵称
- 时区
- 体重单位
- 饮水单位
- 提醒开关
- 睡眠 / 体重 / 饮水目标（支持至少 / 不超过 / 区间三种模式）

### 4.3 记录与回看

- Today 手动记录睡眠 / 体重 / 饮水
- 支持补录最近 365 天
- 支持清空某一天记录
- Dashboard 7/30 天摘要 + 周期变化总结
- Trends 趋势图（含补录标记 + 波动检测 + 目标偏差洞察）
- History 按月回看（含月度小结）
- CSV / JSON 导出

### 4.4 习惯与观察底座

- 站内提醒
- 连续缺失/未达标提醒
- 页面访问埋点
- 注册/登录/首次记录埋点
- 使用观察报表脚本

---

## 5. 当前技术实现

- 前端：`Next.js App Router + React + TypeScript + Tailwind + Recharts`
- 后端：`Next.js Route Handlers`
- 数据库：`PostgreSQL`
- ORM：`Prisma`
- 校验：`Zod`
- 密码：`bcryptjs`
- 会话：数据库 `Session` + Web `HttpOnly Cookie` + 小程序 `Authorization: Bearer`

当前核心表：

- `User`
- `UserProfile`
- `Session`
- `WechatIdentity`
- `DailyRecord`
- `Goal`
- `EmailVerificationToken`
- `PasswordResetToken`
- `ProductEvent`

---

## 6. 当前项目状态判断

一个新 agent 接手时，可以先默认相信以下判断：

- 认证主路径已经跑通
- Today / Dashboard / Trends / History / Settings 都已经存在并可工作
- 当前产品最重要的页面是 `/today`
- 当前最重要的优化方向不是"加更多功能"，而是"让用户更愿意每天回来记"
- 目前最适合做的是行为设计、提醒、连续记录反馈、回看价值增强

---

## 7. 默认工作规则

新 agent 如果继续开发，建议按下面顺序执行：

1. 先对照 [PRODUCT_ROADMAP_FRAMEWORK.md](./PRODUCT_ROADMAP_FRAMEWORK.md) 检查当前任务是否偏离主线
2. 再看这份文档里的"当前阶段"和"下一步默认主线"
3. 改动优先围绕：
   - Today 记录路径
   - 连续记录反馈
   - 提醒系统
   - Dashboard / Trends 的轻量洞察
4. 每一轮完成后：
   - 跑验证
   - `git commit`
   - `git push`
   - 在这份文档末尾补一条简短记录

默认验证命令：

```bash
npm test
npm run lint
npm run build
```

观察报表命令：

```bash
npm run analytics:report -- --days=30
```

---

## 8. 最近推进记录

下面这部分是按时间顺序记录的简短变更日志。

## 2026-07-05

- 按第一性原理重排当前主线并派出 sub-agent 并行审查：确认下一步不是继续加功能，而是清零小程序 Alpha-001 发放前 P0 blocker；Web MVP 和小程序 Alpha 壳已基本具备，真实缺口集中在合规占位、体验版 / 真机证据、10 人 Alpha 数据、竞品真机实测和 Day 10 复盘证据。
- 修复观察报表本地运行链路：`analytics:report` 和 `analytics:miniprogram` 现在会在动态加载 Prisma 服务前按 Next-like 优先级加载 `.env.local` / `.env` 的 `DATABASE_URL`，避免 `db:doctor` 可连但报表脚本因未加载环境变量而在 `ensureDatabaseSchema` 处失败；同时补充 env diagnostics 单测。
- 保留微信开发者工具写入的小程序编译配置 `minifyWXML`，把它纳入 Git 管理，减少体验版前 Git dirty gate 的误阻塞；当前 `alpha:readiness -- --vercel --remote` 仍因合规占位保持 RED，不能邀请外部 alpha 用户。
- 收口个人开发者 Alpha 合规文案：隐私保护指引、用户协议、健康免责声明和小程序内 legal 页面已写明个人开发者主体、联系邮箱、客服方式、生效日期、当前免费内测口径、未来收费提示、适用法律和争议解决方式；`alpha:readiness -- --vercel --remote` 的合规文档 blocker 已清零，剩余为邮件可选 warning 与真实发放证据。

## 2026-06-21

- 收紧小程序概览 / 趋势行动入口：把大块行动卡改成右侧小胶囊 CTA，固定高度、最小宽度和 flex 居中，解决按钮文字不居中的视觉问题；同时把动态洞察文案继续压缩为 `去记录`、`看趋势`、`先有记录`、`点还不够密` 等更短、更像产品界面的表达，并同步更新相关测试。
- 根据成熟健康产品文案基准重做小程序概览 / 趋势语言：参考 Apple Health、Google/Fitbit、Keep、薄荷等产品的“对象清晰、动作明确、非医疗化”表达，把 `继续回看`、`今天先看`、`目标可以稍后设`、`体重线索`、`对齐率`、`显影` 等口号式或内部化文字收敛为 `今日记录`、`体重趋势`、`日常标签`、`目标达成`、`记录完成度`；同时修复概览页胶囊按钮文字居中问题。
- 二次收紧小程序概览 / 趋势文案：同步修改本地小程序静态标题和后端 `/api/dashboard`、`/api/trends` 动态洞察，把残留的 `DASHBOARD`、`WEIGHT TREND`、`达标率`、`日常背景`、`最近走势` 等旧表达改为更短的产品语言；DevTools 若仍显示旧动态文案，需要重新部署同一 Vercel 项目并重新编译预览。

## 2026-06-20

- 统一 Web 与小程序用户可见文案：将首页、登录注册、Today、Dashboard、Trends、History、Settings、等待名单、提醒和动态洞察从说明书式表达改为更简洁的产品语言，核心语气收敛为“把日常记成线索 / 变化显影”；同步更新小程序登录、记录、概览、趋势、我的页面，清理用户可见的 Alpha / 测试 / 验收口吻，并更新相关测试断言与小程序检查脚本。
- 修正小程序 Today 页按钮 / 标签文字视觉不居中：保存主按钮不再使用微信原生 `button`，改为自绘胶囊容器加独立文字 label；体重背景选项从直接用 `text` 当按钮改为 `view + chip-label`，并补全全局 button reset、固定高度和结构防回退检查，避免微信默认 line-height / baseline 再次造成偏移。
- 优化小程序 Today 记录入口：保存按钮改为更窄的胶囊形态并强制居中，顶部日期胶囊升级为记录日期选择器；用户可在同一张 Today 表单中切换最近 365 天日期并补录历史记录，保存历史日期继续复用现有 `/api/records/[date]`，后端自动标记补录。
- 修复小程序微信登录线上 500：Vercel 日志定位为生产数据库缺少新版账号字段导致 `prisma.user.create()` 报 `P2022`，已在数据库自愈脚本中补齐 `User.emailVerifiedAt`、`UserProfile` 偏好字段和 `Session.lastAccessedAt` 的旧库兼容迁移，并增加回归测试，避免早期生产库阻断小程序首次登录。
- 完成微信开发者工具扫码登录后的内部预览：CLI 已确认 `login:true`，`miniprogram/` 项目可通过开发者工具打开，`preview` 成功生成 78.7KB 预览包和二维码；远程 Experience check 继续通过。体验版上传未执行，因为 `alpha:readiness -- --vercel --remote` 仍因合规占位 / 微信后台人工确认项保持 RED，按当前发放规则不能上传或分享 Experience build。
- 安装并验证微信开发者工具本机环境：已安装 `wechatwebdevtools.app` 2.01.2510290，CLI 服务端口可启动到 `127.0.0.1:9420`，但导入 / 上传小程序被微信开发者工具账号登录拦截；已生成两次扫码二维码但均过期，下一步需要先完成微信开发者工具扫码登录，再继续 `open / preview / upload`。同时把 `miniprogram/project.private.config.json` 加入 `.gitignore`，避免开发者工具本地私有配置污染 Git。
- 对齐 Request 域名配置后的体验版 gate 口径：`alpha:readiness -- --vercel --remote` 现在会用 `launch:check -- --vercel --experience-remote` 判断生产体验版，不再让本地微信密钥、本地数据库超时或可选邮件配置干扰小程序发放判断；远程 Experience check 已验证线上 API、数据库和微信后端配置为可用，剩余 blocker 收敛为合规占位、微信后台隐私 / 类目 / 客服确认、体验版上传和真机证据。

## 2026-06-12

- 调整体验版 gate 为生产环境优先：`miniprogram:check:experience` 在远程模式下不再要求本地保存微信 AppSecret，而是以 Vercel `/api/health` 的远程微信配置为准；`alpha:readiness -- --vercel --remote` 也会在远程数据库通过时，不再让本地 Neon 超时阻断体验版 gate。
- 接入真实微信小程序 AppID：`miniprogram/project.config.json` 已从 `touristappid` 替换为真实小程序 AppID；AppSecret 继续按安全边界处理，不写入 Git、文档、脚本或命令日志，后续只通过不回显的本机输入或平台密钥配置完成验证。
- 补强小程序 Alpha 前的 P1 体验与追溯：登录时会把协议同意状态、版本和时间写入 `WECHAT_LOGIN_COMPLETED` 事件 metadata；小程序“我的”页目标从内部枚举改为自然语言摘要；账号导出会复制一份 JSON 摘要到剪贴板，便于真机验收确认数据权利入口可用。
- 增加 goal 受限时的替代目标控制台：新增 `ACTIVE_OBJECTIVE.md`，把当前目标收敛为清零小程序 Alpha-001 发放前 P0 blocker，并明确下一步队列、sub-agent 拆分边界、完成条件和每轮结束标准；执行简报的读取顺序同步加入该文件。
- 增加微信凭证安全探测与文档边界：新增 `npm run wechat:credential-probe`，只通过环境变量读取 AppID / AppSecret 并输出脱敏分类结果；环境就绪文档明确公众号凭证不能替代小程序凭证，`launch:check` 也开始提示健康免责声明草案中的上线前确认占位。
- 补充后续执行拆解方式：`MINIPROGRAM_ALPHA_EXECUTION_BRIEF.md` 现在明确当前阶段完成后，哪些工作适合交给 sub-agent 并行审查 / 证据整理，哪些阶段性成果适合拆成 Codex 目标功能持续推进，避免下一轮又回到泛泛规划。
- 新增小程序 alpha 邀请闸门：`npm run alpha:invite-gate -- --batch Alpha-001` 会先跑体验版硬闸门，再要求同批次至少 2 份真机会话包含体验版版本号、真实 AppID、API 域名、Git commit 和完整主路径证据；同时修正 phone-session 文件名大小写匹配，避免本地证据文件被漏数。
- 对齐小程序 alpha 邮件配置闸门口径：`alpha:readiness` 现在会把 `EMAIL_FROM` / `RESEND_API_KEY` 这两个仅影响 Web 邮件体验的 launch warning 识别为 optional email warning，不再让小程序体验版 gate 因可选邮件配置变成 YELLOW；其他 launch warning 仍会进入 review。
- 修正小程序 Today 单位一致性：`GET /api/records/today` 会返回用户体重 / 饮水单位，小程序 Today 按用户设置显示 lb / oz 或 kg / ml，并在保存时转换回数据库的 kg / ml 存储口径，避免体验版记录页和 Web 设置不一致。
- 修正小程序 Dashboard 达标率展示口径：概览页不再读取后端不存在的 `window.attainmentRate`，而是基于窗口内各指标 `attainmentRate` 计算平均达标率，避免体验版用户看到误导性的 0%。
- 补强小程序体验版环境变量防误填说明：`.env.example` 现在区分本地数据库、可选 `DATABASE_URL_UNPOOLED`、邮箱配置和微信 AppID / AppSecret，并明确 AppSecret 不能等于 AppID；`ENVIRONMENT_READINESS.md` 同步修正 Git clean gate 的归属，避免只跑 `launch:check` 就误以上传体验版安全。
- 加强微信 AppID / AppSecret 配置防错：`launch:check` 和 `miniprogram:check:strict` 现在会校验 AppID 是否像真实 `wx...` 值，并阻止把 AppID 误填进 AppSecret，减少真实 `wx.login` 前的手动配置试错。
- 补强 evidence pack 终端提示：`alpha:evidence-pack` 现在不仅在本地索引写入 `Experience build gate`，也会在命令行直接打印 release note，避免只看终端输出时误把 RED / YELLOW 证据包当成可发许可。
- 增强 evidence pack 状态防误读：`alpha:evidence-pack` 生成的本地索引现在会提取并写入 `Experience build gate` 的 GREEN / YELLOW / RED 状态和 guidance，明确 RED / YELLOW 只能作为阻塞证据，不能当作体验版发放许可。
- 收紧 alpha evidence pack 可追溯性：`alpha:evidence-pack` 现在会在写入任何 preflight / phone-session / pack-index 前检查 Git working tree，未提交代码会直接失败，避免本地私有证据包绕过 Git clean gate。
- 修正体验版硬闸门执行顺序：`alpha:gate:experience` 现在先跑 strict readiness，只有 Git clean、launch、数据库和远程体验版检查通过后才生成 Day 0 preflight，避免 RED 状态下先留下可被误用的体验版证据文件。
- 收紧体验版证据可追溯性：`alpha:readiness` 现在会先检查 Git working tree 是否干净，`alpha:gate:experience` 会因此阻断未提交代码生成体验版证据，确保真机反馈、批次控制台和 Git commit 能一一对应。
- 改善 Vercel env readiness 失败诊断：`launch:check -- --vercel` 现在会把 Vercel CLI 失败归类成 `network_unreachable` 或 `auth_or_scope`，并给出对应下一步，避免 DNS / 代理问题被误读成单纯没登录。
- 收口体验版远程闸门文档口径：README、环境就绪说明、Alpha 发放包和批次控制台现在都把发放前标准指向 `alpha:gate:experience` / `miniprogram:check:experience`，明确 `miniprogram:check:remote` 只用于定位 API / 数据库可达性，避免只凭 health 通过就邀请真实用户。
- 增强 Day 0 preflight 证据口径：`alpha:preflight` 现在会从 `alpha:readiness` 中提取 `Experience build gate` 状态和 gate guidance，并把 `--remote` 标记为 remote experience check，避免私有预检报告只留下汇总数字却看不出体验版是否 GREEN / RED。
- 收紧 `alpha:readiness --remote` 的远程验收口径：现在会调用体验版级 `miniprogram:check:experience`，把线上 API health、数据库状态、真实 AppID / AppSecret 和远程微信后端凭证状态纳入同一份红绿灯，避免只证明 API 可访问就误以为体验版远程链路可发。
- 收紧小程序 smoke 的账号导出验收：`miniprogram:smoke` 现在会在保存记录、报告曝光 / 点击和 alpha 反馈之后再导出账号数据，并断言导出包含 goals 数组、带 contextTags 的 daily record、wechatIdentities 以及 PAY_INTENT_SHOWN / PAY_INTENT_CLICKED / ALPHA_FEEDBACK_SUBMITTED 事件，确保体验版前数据权利闭环覆盖真实 alpha 数据。
- 补齐小程序后端 smoke 的报告意向漏斗：`miniprogram:smoke` 现在会先记录 `action: "shown"` 的 30 天报告曝光，再记录 `action: "clicked"` 的内测意向点击，覆盖 `payIntentExposureRate` 和 `payIntentClickThroughRate` 两段 alpha 复盘口径。
- 收紧 alpha readiness 的红灯判定：`alpha:readiness` 现在会把 `launch:check` 中的 blocker 映射为真正的 fail，而不是 review/warn；只有 launch 里没有 blocker、仅有 warning 时才进入 review，避免真实 AppID、合规占位等 P0 项未清时误判体验版 gate 接近可发。
- 改善本地小程序 Docker smoke 的失败诊断：`miniprogram:smoke:docker` 在找不到 Docker CLI 时会明确提示安装 / 启动 Docker Desktop 或改用已有本地 API 跑 `miniprogram:smoke`，不再只暴露 `spawnSync docker ENOENT` 这类底层错误。
- 收紧小程序体验版合规 readiness：`launch:check` 现在不只检查合规草案文件是否存在，还会把隐私保护指引、用户协议和提交清单里的主体、联系方式、生效日期、收费模式 / 收费规则占位列为 blocker 或 warning，避免把“有草稿”误判成“可发体验版”。
- 补强小程序体验版前防回归测试：`miniprogram-page-behavior` 现在覆盖登录协议拦截、`wx.login` 失败诊断、Dashboard 行动卡跳转、Trends 空状态 / 低记录密度行动入口、Me 页报告曝光去重；账号导出测试也明确覆盖 goals、dailyRecords.contextTags、wechatIdentities 和 productEvents，减少体验版前主路径和数据权利入口的隐性回归。
- 强化小程序 alpha 样例报告防误判：`analytics:miniprogram -- --sample` 即使带上手动 evidence flags，也会强制输出 `decisionReview.recommendation = needs_data` 并写入 sample blocker，确保样例报告只能预览版式，不能被误当作 beta / 商业化决策证据。
- 修正研究材料 README 的 Day 0 / Day 10 边界：`research/README.md` 现在明确 `alpha:evidence-pack` 只生成 preflight、phone session 和 pack index，不生成 Day 10 analytics report；单测同步覆盖该说明，避免后续把样例报告误写回发放证据包。
- 拆清 Day 0 发放证据和 Day 10 复盘证据：`alpha:evidence-pack` 现在只生成 preflight 和两份真机会话模板，不再生成 sample Day 10 report；`ALPHA_BATCH_CONTROL.md` 把体验版 Release Gates 和 Day 10 Decision Gates 分开，避免把样例报告误当真实 alpha 复盘证据。
- 增加 Day 10 alpha 证据检查：新增 `npm run alpha:evidence-check -- --batch Alpha-001 --strict`，会检查 2 份真机会话、10 人用户证据、3 条以上用户原话和竞品实测 synthesis；`analytics:miniprogram -- --evidence-check --batch Alpha-001` 可自动读取检查结果，减少仅靠手动 evidence flag 误判 beta 候选的风险。
- 补齐 Today 记录摩擦埋点：新增 `RECORD_FORM_STARTED` 和 `RECORD_SAVE_ATTEMPTED`，Web / 小程序进入记录页和保存尝试都会进入 ProductEvent；小程序 alpha report 新增 `recordFormStartRate`、`recordSaveAttemptRate`、`recordSaveSuccessRate`，便于区分用户没进入、没尝试保存或保存失败。
- 补齐商业意向曝光口径：`/api/intent/pay` 支持 `action: "shown" | "clicked"`，Web Dashboard 和小程序“我的”页会记录 30 天报告入口曝光；小程序 alpha report 新增 `payIntentShownUsers`、`payIntentExposureRate` 和 `payIntentClickThroughRate`，避免只用点击人数误判商业意向。
- 增加体验版硬闸门命令：新增 `npm run alpha:gate:experience -- --batch Alpha-001`，会先生成包含 Vercel env 和远程体验版检查的 Day 0 preflight，再执行 strict readiness 和 strict remote experience check；非 GREEN 会直接失败，减少人工误读红灯 / 黄灯后发体验版的风险。
- 打通 alpha preflight 的完整远程闸门参数：`alpha:preflight` 和 `alpha:evidence-pack` 现在都支持 `--vercel --remote`，Day 0 私有预检报告可以同步包含 Vercel Production 环境变量名称、远程体验版检查、数据库和真实 AppID / AppSecret 状态，避免只在终端看到红灯但证据包漏掉关键 blocker。
- 增强 alpha readiness 总闸门：`npm run alpha:readiness -- --vercel --remote` 现在可把 Vercel Production 环境变量名称和远程体验版检查合并进同一份红绿灯输出；体验版上传前不必再在多个命令之间拼判断，Day 0 阻塞项会更集中。
- 补齐 Web 设置页数据权利入口：Settings 新增“数据与账号”卡片，支持导出个人资料、目标、记录、体重背景、微信身份映射和 ProductEvent，并要求输入 `DELETE` 后才能删除账号；这样 Web 与小程序都具备账号导出 / 删除入口，减少 alpha 前的合规体验断点。
- 增加 Docker Postgres 本地小程序 smoke：新增 `npm run miniprogram:smoke:docker`，会显式使用 docker-compose 中的本地 Postgres、等待 `db:doctor` 通过，再启动本地 Next 和 mock 小程序登录主路径；当 `.env.local` 默认 Neon 连接超时时，仍可先验证登录、记录、Dashboard、Trends、导出、意向和反馈链路。
- 增加体验版 readiness 红绿灯：`alpha:readiness` 现在会在顶部输出 `Experience build gate: GREEN / YELLOW / RED` 和 Gate checklist，明确 RED / YELLOW 时不要邀请外部 alpha 用户；保留原有子检查和 Manual next actions，便于 Day 0 一眼判断体验版是否可发。
- 收紧小程序 Alpha 复盘决策报告：`analytics:miniprogram` 新增 `decisionReview`，把 10 人样本、首次完整记录率、留存、体重 / 背景填写、付费意向、反馈率和人工证据标记汇总成 `needs_data / hold_and_improve / beta_candidate` 建议；Day 10 文档命令同步支持 `--real-device-evidence --user-quotes --competitor-fieldwork`，避免只凭 `continue_candidate` 误判可以商业化。
- 强化小程序真机错误态与重试：小程序请求 helper 现在会把 401、HTTP 非 2xx 和网络 / request 合法域名失败转成可读诊断；Today、Dashboard、Trends、Me 和登录页会展示错误详情，加载失败可重新加载，Today 保存失败可重新保存，便于 Day 1 真机验收快速定位 AppID、域名、API 或数据库问题。
- 整合 sub-agent 评审为小程序 Alpha 执行简报：新增 `MINIPROGRAM_ALPHA_EXECUTION_BRIEF.md`，明确当前仍是体验版发放前配置与验收阶段，不可宣称小程序上线 / 商业化完成；文档沉淀竞品真机证据缺口、P0 blocker、7 天最短路径和下一轮最值得做的 3 个代码改动。
- 增加本地 alpha 证据包生成器：新增 `npm run alpha:evidence-pack -- --batch Alpha-001`，一键生成 preflight、internal-01 / internal-02 真机会话、Day 10 样例报告和本地索引，全部落到已忽略的私有证据目录，减少体验版前手工串命令漏步骤。
- 收紧 alpha 证据安全边界：`.gitignore` 现在默认忽略竞品截图 / 录屏、alpha preflight、phone session、Day 10 report 和 private 证据目录；研究文档同步说明只提交脱敏摘要，避免真实用户原话、设备信息、截图、密钥或数据库 URL 被误提交。
- 增加小程序 alpha 复盘样例模式：`analytics:miniprogram` 支持 `--sample`，可在数据库不可达时生成带有 SAMPLE 标记的 Markdown 版式预览，方便先验证 Day 10 报告结构；样例报告明确不能作为真实产品决策证据。
- 改善 alpha 复盘数据库失败诊断：`analytics:miniprogram` 在数据库不可达时不再默认只抛 Prisma 堆栈，而是提示运行 `npm run db:doctor -- --timeout-ms 5000` 和备用连接变量检查；需要底层错误时可追加 `--verbose`。
- 增强小程序 alpha 复盘报告：`npm run analytics:miniprogram` 新增 `--format=markdown` 和 `--out`，可在 Day 10 输出 `research/alpha/reports/Alpha-001-day10.md`，把核心指标、决策门槛、价值 cue、阻力 cue 和注意事项变成可贴进批次控制台的复盘材料。
- 增加真机测试会话生成器：新增 `npm run alpha:phone-session`，可基于 `PHONE_TEST_SESSION_TEMPLATE.md` 自动生成 Day 1 真机验收记录，并预填日期、tester、设备、微信版本、API 域名、Git commit 和 AppID 状态；发体验版前可快速生成 internal-01 / internal-02 两份证据文件。
- 增加 alpha 预检报告生成器：新增 `npm run alpha:preflight`，可把当前 Git commit、API 域名、AppID 状态、`alpha:readiness` 摘要和 `Manual next actions` 生成 Markdown；发体验版前可用 `--out research/alpha/preflight/Alpha-001.md` 留档，避免 Day 0 配置和后续真机证据脱节。
- 把 alpha readiness 变成 Day 0 操作入口：`npm run alpha:readiness` 现在会提取 `launch:check` 的动作清单，并为数据库 / 远程体验版检查失败补充 `Manual next actions`，让体验版前配置不只显示红灯，也能直接看到下一步该处理什么。
- 增强体验版 blocker 行动清单：`launch:check` 现在会在 blocker / warning 后输出 `Next actions`，把真实 AppID、Vercel env、request 域名、mock 开关、缺失文档等问题翻译成具体处理动作；同时把 `ALPHA_BATCH_CONTROL.md` 纳入发放前文件检查。
- 增加小程序 alpha 批次控制台：新增 `research/alpha/ALPHA_BATCH_CONTROL.md`，把 release gates、真实 AppID / Vercel env / request 域名、2 台真机证据、10 人 7 天跟踪、`analytics:miniprogram` 快照和 beta / 继续优化决策放到同一张操作台里，避免体验版发放后版本、证据和指标脱节。
- 增加 alpha readiness 总览：新增 `npm run alpha:readiness`，聚合 `launch:check`、`miniprogram:check`、`research:check` 和 `db:doctor`，用于体验版前快速判断当前 blocker 集中在哪里；当前总览显示小程序结构和研究包通过，launch 仍有 3 个外部配置 blocker，数据库连接仍超时。
- 收紧小程序账号删除后的会话清理：`clearSession` 现在支持传入 Request，Bearer 请求会删除对应 session token 而不读取 Web Cookie；`DELETE /api/account` 改为按当前请求清理登录态，让小程序账号删除闭环更清晰。
- 增加小程序页面行为防回归测试：新增 `miniprogram-page-behavior` 单测，通过模拟 `wx`、`Page` 和 Bearer 请求覆盖 Today 完整保存反馈、空记录拦截、Me 页 alpha 反馈提交后清空状态、删除账号必须二次确认，减少真实体验版前的交互回归风险。
- 增加数据库可达性诊断：新增 `npm run db:doctor`，按 Next env 优先级识别 `DATABASE_URL` 来源和数据库 host，只输出非敏感信息并实际测试连接；本地 smoke 也支持 `--database-url-env` 切换备用连接变量。当前 `db:doctor` 定位到 `.env.local` 的 Neon pooler 和 unpooled 连接都超时，解释了本地 alpha smoke 卡在 database health 的原因。
- 增加一键本地小程序 alpha smoke：新增 `npm run miniprogram:smoke:local`，会自动启动本地 Next、临时开启 mock 登录、等待 `/api/health`、跑登录/记录/Dashboard/Trends/导出/意向/反馈主路径并默认清理 smoke 账号；当前实际运行卡在本地数据库 health `degraded`，脚本已输出 database / wechat / mockLogin 诊断，便于继续定位环境问题。
- 收紧小程序 alpha 漏斗归因：记录保存服务现在会给 `FIRST_RECORD_SAVED` 和 `FIRST_COMPLETE_RECORD_SAVED` 里程碑事件补充 `platform` metadata；Bearer 保存 `/api/records/[date]` 的测试覆盖 `wechat_mp` 归因，避免首次记录率 / 首次完整记录率在小程序 alpha 报表里被漏算或混入 Web。
- 强化小程序上线前检查诊断：`launch:check` 现在会检查竞品实测和 alpha 用户证据模板；`miniprogram:check:remote` 失败时会输出 health URL 和底层错误原因，便于区分 DNS、Vercel、数据库或微信密钥配置问题。
- 新增微信竞品实测采集包：`research/WECHAT_COMPETITOR_FIELDWORK.md` 固化 8 类小程序样本、截图/录屏证据要求、评分口径和“必须学 / 暂不学 / 待验证”路线结论；同时补 `research/evidence`、单样本 notes 模板、竞品汇总表、alpha 用户证据表和真机测试模板，并用 `npm run research:check` 防止把未真机验证的公开资料误写成竞品结论。
- 新增小程序体验版 Alpha 发放包：补齐发给 10-30 个真实测试用户前的发放闸门、邀请文案、7 天任务卡、观察记录、访谈问题和复盘指标，并纳入 launch readiness 检查，避免体验版发放只停留在技术自检。
- 优化小程序“我的”页 alpha 收口：新增 7 天测试任务入口，把记录、概览、趋势和反馈串成一轮测试节奏；30 天体重观察报告改成更明确的 waitlist / 内测意向表达，反馈提交后会清空选择状态，减少重复提交误判。
- 优化小程序 Trends alpha 回看价值：体重趋势页新增趋势结论、最近 14 天轻量走势条、上一周期对比、体重背景线索和回到记录的行动入口；补录/缺失/当天记录在最近记录中有明确区分，让趋势页更适合真实用户理解“为什么要连续记录”。
- 优化小程序 Dashboard alpha 回看价值：`/api/dashboard` 下发 `insights` 和 `weightContext`，小程序概览页新增“今天先做什么”、体重变化线索、今日三项状态和最近 7 天摘要，让用户从 Today 保存后能更快理解下一步关注点。
- 优化小程序 Today alpha 记录体验：首屏改为体重优先的今日称重焦点区，展示完成进度、下一步提示和保存后去 Dashboard 的单一 CTA；同时接入后端 `qualityWarnings`，对明显异常的睡眠、体重、饮水输入给出温和确认提示。
- 整合 sub-agent 并行评审结论：`WECHAT_MINI_PROGRAM_VALIDATION_PLAN.md` 新增公开资料竞品预调研、当前 Alpha 作战板、P0 blocker 和 10 人真实用户 alpha 节奏；同时明确公开资料不能替代微信真机实测，仍需补 8 个以上真实小程序体验样本。
- 收敛记录保存口径：新增共享保存服务，让 `/api/records/today` 和 `/api/records/[date]` 共用同一套保存、补录标记、质量提示和 ProductEvent 埋点逻辑，降低小程序 alpha 与 Web 数据口径不一致的风险。
- 补齐账号数据权利闭环：账号导出现在包含与账号关联的 ProductEvent，账号删除会先清理该用户的产品事件，再删除用户主体；隐私说明、用户协议、小程序说明和验收清单同步更新，覆盖 alpha 反馈、页面访问和报告内测意向这类验证数据。
- 增加 alpha 用户反馈闭环：新增 `POST /api/feedback`，小程序“我的”页可提交评分、最有用的点、最卡的点和一句话反馈；反馈复用 `ProductEvent` 的 `ALPHA_FEEDBACK_SUBMITTED`，并进入 `analytics:miniprogram` 的反馈人数、反馈率、平均评分、价值感和阻力统计，用于判断用户是否能复述产品价值。
- 增加小程序 alpha 指标报告：新增 `npm run analytics:miniprogram -- --days=30`，基于现有 `ProductEvent` 和 `DailyRecord` 输出 alpha 用户数、首次完整记录、次日回访、7 日记录天数、体重/上下文填写率、Dashboard/Trends 使用率、付费意愿点击率和 `decision`；Dashboard/Trends 的 Bearer 请求现在会记录小程序 page view，方便判断是否值得进入 beta。
- 增加小程序 alpha 主路径 smoke：新增 `npm run miniprogram:smoke`，可在 local/preview 环境启用 mock 登录后，用同一套 Bearer API 验证登录、今日记录保存、Dashboard、体重趋势、资料/目标、账号导出和报告内测意向；它不替代微信开发者工具/真机验收，但能先定位后端主路径是否可用。
- 补小程序无微信凭证时的主路径测试能力：新增受控 mock 登录，只有 `WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED=true` 且非 Vercel Production 时才接受 `mock:` 登录 code；小程序端默认 `mockLoginEnabled=false` 不展示按钮，临时开启后可先测试 Today / Dashboard / Trends / 我的页。launch 检查会把正式体验版前未关闭 mock 视为 blocker。
- 增加小程序体验版环境就绪检查：新增 `npm run launch:check`、`npm run launch:check:strict`、`npm run launch:check:vercel` 和 `miniprogram/ENVIRONMENT_READINESS.md`，把真实 AppID、Vercel Production 环境变量、HTTPS API 域名、合规材料和测试清单纳入同一套检查；默认命令只报告缺口，strict 才失败，便于当前缺外部配置时继续推进。
- 补小程序体验版 API 可达性定位：新增 `GET /api/health`，返回服务、数据库和微信小程序后端配置的最小健康状态；`npm run miniprogram:check:remote` 可按 `src/config.js` 的 API 域名检查线上 `/api/health`，用于区分 Vercel/API/数据库/微信密钥配置问题。
- 增加小程序体验版自检能力：新增 `npm run miniprogram:check` 和 `npm run miniprogram:check:strict`，可检查小程序页面结构、HTTPS API 域名、Bearer token、协议确认、账号导出/删除和报告内测入口；同时新增 `miniprogram/TESTING_CHECKLIST.md`，把微信开发者工具导入、主路径验收和测试证据记录模板固化下来。
- 收紧协议同意闭环：Web 注册表单新增隐私保护指引 / 用户协议确认，`POST /api/auth/register` 也会拒绝未同意的注册请求；小程序登录前新增同意确认，未确认时不会调用微信登录。这样从“有入口可看”推进到“账号创建前有明确确认”。
- 把合规草案推进成产品内可访问入口：Web 新增 `/legal`、`/legal/privacy`、`/legal/terms`、`/legal/health-disclaimer`，首页和登录/注册页均可进入；小程序新增协议与说明页，并在登录页和“我的”页露出隐私保护指引、用户协议、健康免责声明。当前仍需正式主体信息、微信后台隐私配置和法律确认后才能用于正式上线。
- 补齐小程序审核前材料草案：新增隐私保护指引、用户协议、健康免责声明和体验版 / 审核前检查清单，覆盖主体信息、数据收集、非医疗边界、账号删除、域名环境、测试路径和商业测试门槛；这些文件仍需正式主体和法律/平台后台确认。
- 增加轻付费意愿验证：新增 `POST /api/intent/pay` 和 `PAY_INTENT_CLICKED` 埋点，Dashboard 与小程序“我的”页提供“30 天体重观察报告”内测入口；仅记录等待/意向，不创建订单、不接微信支付，analytics report 已支持输出点击量、点击用户数和点击率。
- 补齐小程序上线前合规底座第一步：新增 `GET /api/account/export` 和 `DELETE /api/account`，支持导出个人资料、目标、记录、上下文标签和微信身份映射，并可删除账号及关联数据；小程序“我的”页已接入导出与删除入口。
- 推进小程序最小前端壳：新增 `miniprogram/`，可导入微信开发者工具，覆盖登录、今日记录、简版 Dashboard、体重趋势、我的 / 设置 5 个页面；前端通过 `wx.login` 和 Bearer token 复用现有后端，当前仍不包含支付、订阅消息、设备接入或正式审核材料。
- 扩大小程序 alpha API 兼容面：`profile/goals/trends/export` 也改为支持 `Authorization: Bearer`，加上上一轮的 `records/dashboard` 后，最小小程序壳需要的主要数据接口已可复用现有后端；Web Cookie 路径保持不变。
- 推进小程序 alpha 技术底座第一步：新增 `WechatIdentity`、`POST /api/mp/auth/wechat-login` 和 Bearer Session 兼容；小程序登录返回自定义 token，不下发微信 `session_key`，`records/dashboard` API 已可通过 `Authorization: Bearer` 访问，Web Cookie 登录不受影响。
- 推进 Web 轻体重管理验证版第四步：History 月度回看新增“体重背景”摘要和每日背景标签列，让用户能从月度明细回看体重记录背后的饮食、活动和称重时段线索；仍保持为记录辅助信息，不做因果判断。
- 推进 Web 轻体重管理验证版第三步：Trends 体重趋势新增“体重背景回看”，统计当前窗口中带有背景标签的体重记录天数和最常见背景；睡眠/饮水趋势不展示背景摘要，继续避免泛健康分析和因果化解读。
- 推进 Web 轻体重管理验证版第二步：Dashboard 新增“体重变化线索”，把最近 7 天体重变化、记录密度和最常见背景标签放在一起回看；文案保持“线索”而非因果/医疗判断，让 contextTags 开始产生解释价值。
- 推进 Web 轻体重管理验证版第一步：DailyRecord 新增 `contextTags`，Today 页支持饮食状态、活动量、精神状态、称重时段四类受控标签；保存、读取、导出和埋点均已接入，仍不新增正式健康指标、不做食物库或医疗判断。
- 新增 `WECHAT_MINI_PROGRAM_VALIDATION_PLAN.md`，把中国大陆商业化方向拆成微信竞品实测、Web 轻体重管理验证、小程序 alpha 技术底座、上线合规和商业测试门槛；当前结论是先补真实微信内竞品证据，再在 Web 验证轻体重管理价值闭环，不直接重做小程序。

## 2026-04-12

- `04700b3-qwen` 完成 Round 4 阶段 D 评估结论记录：本轮未生成有效的 30 天 analytics report，因为当前执行环境未连接数据库，无法据此判断是否进入阶段 D。按 roadmap 继续维持当前结论：**暂不进入阶段 D，继续留在 Web 主路径优化。**
- `d595fe1-qwen` 完成 Round 3 首用闭环收紧：Dashboard 按用户状态显示不同引导（没有完整记录只显示关键下一步、有完整记录但没设目标显示轻量 CTA 去设置、有记录有目标不再显示新手提示），不增加新页面。
- `cde802f-qwen` 完成 Round 2 提醒系统增强：提醒固定优先级排序（今天完全未记 > 今天部分未记 > 连续缺失指标 > 连续未达标目标 > 目标未配置），每次页面最多展示 2 条，文案保持非评判式。
- `f926ba2-qwen` 完成 Round 1 Today 页记录路径优化：保存成功后只显示一个主 CTA（去 dashboard），保存区改为 sticky 更易触达，快捷填充只更新表单不自动保存。

## 2026-04-11

- `ce7debc-qwen` 完成阶段 C3 的月度小结：History 页新增月度洞察，对比上月记录密度，识别最容易漏记的指标。
- `7cee296-qwen` 推进阶段 C3 的实时目标反馈：Today 页在输入过程中直接显示"还差多少 / 是否已对齐目标"，用户不用先保存再跳到 Dashboard 才知道当前记录离目标还有多远。
- `7715840-qwen` 完成阶段 C3 的目标偏差洞察：Dashboard 和 Trends 开始显示"距离目标还差多少 / 是否已经落在目标区间内"，用户不只知道有没有达标，也知道偏差方向和幅度。
- `4a79814-qwen` 完成阶段 C2 的目标系统语言统一：设置页直接说明"系统会怎样判断达标"，Dashboard / Trends / Reminder 也统一改成同一套目标语言。
- `9e261f9-qwen` 校正趋势图细节：补录 tooltip 原先把数值单位写成了占位词"单位"，现已改为显示真实单位，避免趋势阅读时产生歧义。

## 2026-04-10

- `e88affe-qwen` 完成阶段 C3 的周期变化总结：Dashboard 新增"最近 30 天变化小结"洞察，自动识别进步最明显和最需要关注的指标，引导用户优先关注落后项。
- `5bb3272-qwen` 推进阶段 C3 的轻量观察能力：趋势洞察新增指标波动检测，当标准差超过阈值（睡眠>0.5h、体重>0.8kg、饮水>400ml）时提示"波动有点大"，引导用户回顾日常节奏。
- `83e19ec-qwen` 完成阶段 C2 的目标系统表达优化：用行为化按钮替代抽象下拉框（如"每天至少睡够"、"保持在这个区间"），为每个指标推荐最适合的模式（睡眠/饮水→至少、体重→区间），非选中推荐项显示"推荐"标记。
- `8746d81-qwen` 完成阶段 C1 的趋势图表补录标记：TrendPoint 新增 `isBackfilled` 字段，趋势图用空心圆区分补录记录，tooltip 显示"此为补录记录"提示，图例说明当日/补录样式。
- 强化阶段 B3 的轻量洞察：Dashboard 新增"今天先做什么 / 这周最该看什么"，Trends 新增单指标洞察和与上一周期对比。
- 强化阶段 B1/B2 的连续记录反馈：提醒开始区分"今天没记""已经离开几天""连续记录正在形成"，仪表盘同步显示离下一段连续记录还差多少。
- 补强 `PROGRESS_LOG.md`，让零上下文 coding agent 只读这一份文档也能知道项目定位、边界、阶段、当前状态和默认下一步。
- `c490095` 完成阶段 A4 的基础埋点与漏斗观察：新增 `ProductEvent`、关键路径埋点、页面访问埋点和内部使用报表脚本。

## 2026-04-08

- `7d9e4cc` 收紧注册到首次记录的主路径：注册后直接进入 Today，Today 页新增完成进度、缺失提示和最近值快填。
- `417defc` 补齐阶段 A1 的账号安全闭环：邮件验证、忘记密码、重置密码、未验证邮箱提示。
- `1205b3f` 收紧入口页和体验页文案，减少解释感，让产品表达更像成熟产品。
- `75fdd48` 新增项目总结文档，梳理项目定位、能力现状和技术实现。

## 2026-04-07

- `cdf3ac5` 整理并合并远端 bootstrap 状态，建立稳定的 GitHub 主线。
- `80522a4` 完成 Web 健康追踪器初始版本：认证、记录、仪表盘、趋势、设置等核心能力落地。
