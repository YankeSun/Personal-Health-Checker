# Personal Health Checker 小程序环境就绪检查

这份文档用于回答一个很具体的问题：当前环境离“可以发微信体验版找人试用”还差什么。

## 1. 推荐检查顺序

先跑不阻塞的总览：

```bash
npm run alpha:readiness
npm run launch:check
```

`alpha:readiness` 会聚合 Git working tree、launch 配置、小程序结构、研究材料和数据库可达性，并在顶部输出 `Experience build gate: GREEN / YELLOW / RED`；只有 `GREEN` 才能继续进入严格检查、远程检查和真机证据收集。它也会在末尾汇总 `Manual next actions`；`launch:check` 则专门展开体验版配置项。

准备上传体验版前，建议直接跑完整总览：

```bash
npm run alpha:readiness -- --vercel --remote
```

其中 `--vercel` 会把 Vercel Production 环境变量名称检查并入 readiness，`--remote` 会把体验版级远程小程序检查并入同一份输出，包括线上 API health、数据库状态、真实 AppID / AppSecret 和远程微信后端凭证状态。两者同时使用时，readiness 会按生产体验版口径运行 launch 检查：本地 `DATABASE_URL`、本地微信环境变量和本地 `db:doctor` 只影响本地后端验证，不阻断 Vercel-backed Experience build；最终以 Vercel env 加远程 `/api/health` / `miniprogram:check:experience` 为准。

如果要把同一组检查留成 Day 0 私有证据报告：

```bash
npm run alpha:preflight -- --vercel --remote --out research/alpha/preflight/Alpha-001.md
```

真正准备上传体验版前，使用硬闸门：

```bash
npm run alpha:gate:experience -- --batch Alpha-001
```

这个命令会先跑 strict readiness；只有 readiness 是 GREEN，才会生成 Day 0 preflight，并在严格远程体验版检查不是 GREEN 时直接失败。

如果 `launch:check` 发现 blocker 或 warning，输出末尾会给出 `Next actions`，把每个失败项翻译成下一步要去哪里配置或修改什么。

`launch:check` 会检查：

- Vercel 项目是否已 link 到当前仓库
- 小程序 `apiBaseUrl` 是否是 HTTPS
- `project.config.json` 是否还是游客 AppID
- 小程序 mock 登录按钮是否仍保持关闭
- 本地是否能看到 `DATABASE_URL`、`SESSION_SECRET`、微信小程序 AppID / AppSecret；如果使用 `--vercel --remote` 验证生产体验版，这些本地值不会替代或阻断 Vercel Production env
- `WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED` 是否没有为正式体验版开启
- 合规草案、测试清单、验证方案是否存在
- 隐私保护指引、用户协议和提交清单是否仍有主体、联系方式、生效日期、收费规则等占位
- alpha 批次控制台是否存在，避免体验版发放后版本、证据和指标脱节

Git working tree 是否干净由 `alpha:readiness` 和 `alpha:gate:experience` 统一检查；不要只跑 `launch:check` 就上传体验版。

准备体验版前跑严格检查：

```bash
npm run launch:check:strict
```

如果要直接检查 Vercel Production 环境变量名称是否齐全：

```bash
npm run launch:check:vercel
```

这个命令只读取变量名，不打印变量值。

如果是在生产体验版口径下排查 launch 配置，而不是验证本地后端环境，可以使用：

```bash
npm run launch:check -- --vercel --experience-remote
```

这个口径会保留 Vercel 变量名、项目配置、合规文件和微信后台相关检查，但不会把本地 `.env.local` 缺少微信密钥或本地数据库超时当成体验版 blocker。

## 2. 必须补齐的配置

体验版前至少需要：

- 本地 `.env.local` 可从仓库根目录的 `.env.example` 复制生成，只填真实值到本机或部署平台，不提交
- `miniprogram/project.config.json` 中的 `appid` 改成真实小程序 AppID
- Vercel Production 配置 `DATABASE_URL`
- Vercel Production 配置 `SESSION_SECRET`
- Vercel Production 配置 `WECHAT_MINI_PROGRAM_APP_ID`
- Vercel Production 配置 `WECHAT_MINI_PROGRAM_APP_SECRET`
- Vercel Production 不配置 `WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED=true`
- 微信公众平台配置 request 合法域名，域名应与 `miniprogram/src/config.js` 的 `apiBaseUrl` 一致

可选但建议：

- `DATABASE_URL_UNPOOLED`
- `EMAIL_FROM`
- `RESEND_API_KEY`

`DATABASE_URL_UNPOOLED` 用于 Neon pooled 连接不可达时的诊断 / 本地 smoke 备用连接；缺失时不会阻塞小程序 alpha。`EMAIL_FROM` 和 `RESEND_API_KEY` 用于邮箱验证和密码重置的真实邮件发送；缺失时不会阻塞小程序 alpha，但会影响 Web 账号安全体验。

## 3. 公众号凭证与小程序凭证

微信公众号 AppID / AppSecret 不能直接替代微信小程序 AppID / AppSecret。当前小程序登录链路使用 `wx.login` 和服务端 `sns/jscode2session`，必须使用与体验版小程序一致的 AppID / AppSecret。

如果你只有公众号凭证，先在微信公众平台确认账号类型，或创建 / 关联一个小程序，并进入小程序后台复制小程序 AppID / AppSecret。不要把公众号 AppSecret 填入 `WECHAT_MINI_PROGRAM_APP_SECRET`。

可以用下面的只读探测命令做安全检查，脚本不会打印 token、secret 或 openid：

```bash
npm run wechat:credential-probe
```

默认探测只会用假 `js_code` 判断 AppID / AppSecret 是否被微信接口立即判错；它不能证明体验版可登录。若要证明真实小程序链路，需要在微信开发者工具里用同一个 AppID 运行小程序，拿到真实 `wx.login` code 后临时设置 `WECHAT_LOGIN_CODE` 再运行：

```bash
WECHAT_LOGIN_CODE="real-wx-login-code" npm run wechat:credential-probe -- --strict
```

真实 code、AppSecret、token 和 openid 都不要提交到 Git，也不要写入共享文档。

## 4. 配置后验证

配置完成后按顺序跑：

```bash
npm run launch:check:vercel
npm run miniprogram:check:strict
npm run miniprogram:check:experience
```

如果 `launch:check:vercel` 通过，说明 Vercel 变量名齐全。

如果 `miniprogram:check:strict` 通过，说明本地小程序 AppID 和微信后端变量齐全；如果只验证 Vercel-backed Experience build，则以 `miniprogram:check:experience` 和 `alpha:readiness -- --vercel --remote` 为准。

如果 `miniprogram:check:experience` 通过，说明线上 API、数据库和远程微信后端凭证都满足体验版级检查。`miniprogram:check:remote` 只用于单独定位线上 API / 数据库可达性，不作为发放真实用户的通过标准。

## 5. 常见失败解释

| 失败项 | 含义 | 下一步 |
|---|---|---|
| `Git working tree` | 当前还有未提交文件，体验版证据无法可靠对应到一个 commit | 先 `git commit` / `git push`，或 stash 无关本地文件，再生成 preflight / evidence pack / 上传体验版 |
| `project.config.json uses a real AppID` | 当前仍是 `touristappid`，或 AppID 不像真实 `wx...` 小程序 AppID | 到微信公众平台复制真实 AppID，写入 `project.config.json` |
| `WECHAT_MINI_PROGRAM_APP_ID` | 后端不知道当前小程序 AppID，或本地值不像真实 `wx...` AppID | 在本地和 Vercel 环境变量中配置与 `project.config.json` 一致的 AppID |
| `WECHAT_MINI_PROGRAM_APP_SECRET` | 后端无法完成 `code2Session`，或误把 AppID 填到了 AppSecret | 在本地和 Vercel 环境变量中配置微信公众平台里的 AppSecret，不要提交、不与 AppID 混用 |
| `remote database check is ok` | 线上数据库不可达或未配置 | 检查 `DATABASE_URL` 和 Neon 状态 |
| `remote API health endpoint responds` | API 域名不可访问或部署未更新 | 检查 Vercel deployment 和 `apiBaseUrl` |
| `mock login` | 内部测试登录仍处于开启状态 | 正式体验版前关闭小程序配置和后端环境变量 |
| `Vercel environment variables can be listed` | 当前终端无法读取 Vercel Production env，可能是 DNS / 代理 / 直连网络问题，也可能是登录账号或 scope 不对 | 先看输出里的 `network_unreachable` / `auth_or_scope`，再分别处理网络或重新 `vercel login` / 确认 scope |

## 6. 不要提交的内容

不要把以下内容写入 Git：

- 真实 `WECHAT_MINI_PROGRAM_APP_SECRET`
- 真实 `DATABASE_URL`
- 真实 `SESSION_SECRET`
- Vercel token
- 微信公众平台账号密码

真实密钥只放在本机环境变量、Vercel 环境变量或微信公众平台后台。

## 7. 内部 mock 登录

如果还没有真实 AppID / AppSecret，但需要先测试小程序 Today、Dashboard、Trends、我的页，可以临时开启 mock 登录：

1. 本地或测试环境设置 `WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED=true`
2. 将 `miniprogram/src/config.js` 中的 `mockLoginEnabled` 临时改成 `true`
3. 导入微信开发者工具，勾选协议后点击“内部测试登录”

注意：

- mock 登录只用于内部测试。
- Vercel Production 中不应开启 `WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED=true`。
- 提交代码前应把 `mockLoginEnabled` 改回 `false`。
- mock 登录不能替代真实微信 `wx.login` 和 `code2Session` 验证。

开启 mock 后，可以先用脚本验证后端主路径：

```bash
npm run miniprogram:smoke:local
```

它会自动启动本地 Next 服务、设置 `WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED=true`、等待 `/api/health`、跑登录到反馈的主路径，并默认删除 smoke 账号。

如果默认 `DATABASE_URL` 指向 Neon 但当前网络不可达，可以使用 Docker Postgres 跑完整本地主路径；这需要本机已安装 Docker Desktop / Docker CLI：

```bash
npm run miniprogram:smoke:docker
```

如果 `/api/health` 卡在 `database=error` 或 `health=degraded`，先跑：

```bash
npm run db:doctor
```

如果当前 `.env.local` 默认数据库不可达，但同一个文件里有可用的备用连接，可以让 smoke 使用指定变量名：

```bash
npm run db:doctor -- --database-url-env DATABASE_URL_UNPOOLED
npm run miniprogram:smoke:local -- --database-url-env DATABASE_URL_UNPOOLED
```

如果已经有 local 或 preview API 在运行，也可以直接指定地址：

```bash
npm run miniprogram:smoke -- --base-url http://localhost:3000 --cleanup
```

如果需要保留测试账号排查问题，可以让本地包装命令跳过清理：

```bash
npm run miniprogram:smoke:local -- --no-cleanup
```
