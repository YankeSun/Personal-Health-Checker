# Personal Health Checker 小程序环境就绪检查

这份文档用于回答一个很具体的问题：当前环境离“可以发微信体验版找人试用”还差什么。

## 1. 推荐检查顺序

先跑不阻塞的总览：

```bash
npm run launch:check
```

它会检查：

- Vercel 项目是否已 link 到当前仓库
- 小程序 `apiBaseUrl` 是否是 HTTPS
- `project.config.json` 是否还是游客 AppID
- 本地是否能看到 `DATABASE_URL`、`SESSION_SECRET`、微信小程序 AppID / AppSecret
- 合规草案、测试清单、验证方案是否存在

准备体验版前跑严格检查：

```bash
npm run launch:check:strict
```

如果要直接检查 Vercel Production 环境变量名称是否齐全：

```bash
npm run launch:check:vercel
```

这个命令只读取变量名，不打印变量值。

## 2. 必须补齐的配置

体验版前至少需要：

- `miniprogram/project.config.json` 中的 `appid` 改成真实小程序 AppID
- Vercel Production 配置 `DATABASE_URL`
- Vercel Production 配置 `SESSION_SECRET`
- Vercel Production 配置 `WECHAT_MINI_PROGRAM_APP_ID`
- Vercel Production 配置 `WECHAT_MINI_PROGRAM_APP_SECRET`
- 微信公众平台配置 request 合法域名，域名应与 `miniprogram/src/config.js` 的 `apiBaseUrl` 一致

可选但建议：

- `EMAIL_FROM`
- `RESEND_API_KEY`

这两个用于邮箱验证和密码重置的真实邮件发送；缺失时不会阻塞小程序 alpha，但会影响 Web 账号安全体验。

## 3. 配置后验证

配置完成后按顺序跑：

```bash
npm run launch:check:vercel
npm run miniprogram:check:strict
npm run miniprogram:check:remote
```

如果 `launch:check:vercel` 通过，说明 Vercel 变量名齐全。

如果 `miniprogram:check:strict` 通过，说明本地小程序 AppID 和微信后端变量齐全。

如果 `miniprogram:check:remote` 通过，说明线上 API 和数据库可达。

## 4. 常见失败解释

| 失败项 | 含义 | 下一步 |
|---|---|---|
| `project.config.json uses a real AppID` | 当前仍是 `touristappid` | 到微信公众平台复制真实 AppID，写入 `project.config.json` |
| `WECHAT_MINI_PROGRAM_APP_ID` | 后端不知道当前小程序 AppID | 在 Vercel 环境变量中配置 |
| `WECHAT_MINI_PROGRAM_APP_SECRET` | 后端无法完成 `code2Session` | 在 Vercel 环境变量中配置 |
| `remote database check is ok` | 线上数据库不可达或未配置 | 检查 `DATABASE_URL` 和 Neon 状态 |
| `remote API health endpoint responds` | API 域名不可访问或部署未更新 | 检查 Vercel deployment 和 `apiBaseUrl` |

## 5. 不要提交的内容

不要把以下内容写入 Git：

- 真实 `WECHAT_MINI_PROGRAM_APP_SECRET`
- 真实 `DATABASE_URL`
- 真实 `SESSION_SECRET`
- Vercel token
- 微信公众平台账号密码

真实密钥只放在本机环境变量、Vercel 环境变量或微信公众平台后台。
