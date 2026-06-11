# Alpha Batch Control

当前状态：`needs_config`。

这份文件用于管理每一批微信小程序 alpha 体验版。它不是产品方案，而是发放前后的操作台：每一批都必须能追溯到同一个 Git commit、同一个 API 域名、同一组真机证据、同一组用户记录和同一次复盘结论。

安全边界：`research/alpha/preflight/`、`research/alpha/phone-sessions/`、`research/alpha/reports/` 和 `research/evidence/` 默认是本地私有证据目录，并已加入 `.gitignore`。这里只提交脱敏摘要、状态和决策，不提交截图、录屏、手机号、私人聊天内容、可识别用户原话、密钥、token 或数据库 URL。

## 1. Batch Snapshot

| Field | Alpha-001 |
|---|---|
| Batch status | needs_config / internal_testing / recruiting / running / review / closed |
| Owner |  |
| Planned start date |  |
| Git commit |  |
| API domain |  |
| Mini program AppID |  |
| Experience build version |  |
| Target users | 10 |
| Invited users |  |
| Active alpha users |  |
| Decision | needs_data / hold_and_improve / beta_candidate |

## 2. Release Gates

Do not invite external users until every P0 gate is green.

| Gate | Evidence | Status | Owner | Notes |
|---|---|---|---|---|
| Git working tree clean | `npm run alpha:readiness -- --vercel --remote` includes `Git working tree: clean` | blocked / ready |  |  |
| Local evidence pack generated | `npm run alpha:evidence-pack -- --batch Alpha-001 --vercel --remote` | blocked / ready |  |  |
| Experience gate passed | `npm run alpha:gate:experience -- --batch Alpha-001` | blocked / ready |  |  |
| Alpha readiness summary reviewed | `npm run alpha:readiness -- --vercel --remote` output | blocked / ready |  |  |
| Alpha preflight report saved | `npm run alpha:preflight -- --vercel --remote --out research/alpha/preflight/Alpha-001.md` | blocked / ready |  |  |
| Phone session notes created | `npm run alpha:phone-session -- --batch Alpha-001 --tester internal-01` and `internal-02` | blocked / ready |  |  |
| Strict launch check passed | `npm run launch:check:strict` | blocked / ready |  |  |
| Remote experience check passed | `npm run miniprogram:check:experience` | blocked / ready |  |  |
| Real AppID configured | `miniprogram/project.config.json` is not `touristappid` | blocked / ready |  |  |
| Vercel production env configured | Vercel env screenshot or CLI confirmation | blocked / ready |  |  |
| Request domain configured | WeChat public platform screenshot | blocked / ready |  |  |
| Privacy and legal entries configured | WeChat privacy setting screenshot | blocked / ready |  |  |
| 2 real-device sessions passed | `PHONE_TEST_SESSION_TEMPLATE.md` copies with evidence | blocked / ready |  |  |

## 3. Daily Operating Cadence

| Day | Action | Required Evidence |
|---|---|---|
| Day 0 | Configure AppID, secrets, request domain, API domain | Release gates updated in this file |
| Day 1 | Run internal real-device smoke on at least 2 phones | Phone test session notes and screenshots/recordings |
| Day 2 | Invite first 10 users with the release copy | User rows added to `ALPHA_USER_EVIDENCE.md` |
| Day 3-9 | Track whether users return and what blocks them | Daily record count, page views, feedback quotes |
| Day 10 | Run alpha report and decide next move | `npm run analytics:miniprogram -- --days=30` output plus interview notes |

## 4. Day 10 Decision Gates

Do not use this section before real alpha users have finished the test window. Sample reports are only format previews and must not be marked ready here.

| Gate | Evidence | Status | Owner | Notes |
|---|---|---|---|---|
| Alpha evidence check passed | `npm run alpha:evidence-check -- --batch Alpha-001 --strict` | blocked / ready |  |  |
| Alpha analytics report saved | `npm run analytics:miniprogram -- --days=30 --format=markdown --evidence-check --batch Alpha-001 --out research/alpha/reports/Alpha-001-day10.md` | blocked / ready |  |  |
| Evidence-backed recommendation reviewed | `decisionReview.recommendation` from the Day 10 report | needs_data / hold_and_improve / beta_candidate |  |  |
| User quote summary reviewed | Redacted summary from `ALPHA_USER_EVIDENCE.md` | blocked / ready |  |  |
| Competitor benchmark reviewed | `WECHAT_COMPETITOR_SYNTHESIS.md` status is `fieldwork_complete` | blocked / ready |  |  |

## 5. Evidence Map

| Evidence Type | Where To Store | Required Before Decision |
|---|---|---|
| Alpha preflight report | `research/alpha/preflight/Alpha-001.md` local private evidence; paste redacted summary here | yes |
| Real-device smoke notes | `research/alpha/phone-sessions/` local private evidence | yes |
| Alpha analytics report | `research/alpha/reports/Alpha-001-day10.md` local private evidence; paste redacted summary here | yes |
| Alpha user table | `research/alpha/ALPHA_USER_EVIDENCE.md` | yes |
| User quotes | `research/alpha/ALPHA_USER_EVIDENCE.md` | yes |
| Analytics report output | Paste summary below or attach as dated notes | yes |
| Competitor fieldwork | `research/WECHAT_COMPETITOR_FIELDWORK.md` and `research/evidence/` | before beta planning |

## 6. Alpha-001 Daily Tracker

| User | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 | Day 7 | Feedback | Notes |
|---|---|---|---|---|---|---|---|---|---|
| U001 |  |  |  |  |  |  |  |  |  |
| U002 |  |  |  |  |  |  |  |  |  |
| U003 |  |  |  |  |  |  |  |  |  |
| U004 |  |  |  |  |  |  |  |  |  |
| U005 |  |  |  |  |  |  |  |  |  |
| U006 |  |  |  |  |  |  |  |  |  |
| U007 |  |  |  |  |  |  |  |  |  |
| U008 |  |  |  |  |  |  |  |  |  |
| U009 |  |  |  |  |  |  |  |  |  |
| U010 |  |  |  |  |  |  |  |  |  |

## 7. Analytics Snapshot

Paste the Day 10 summary from:

```bash
npm run analytics:miniprogram -- --days=30
npm run analytics:miniprogram -- --days=30 --format=markdown --out research/alpha/reports/Alpha-001-day10.md
npm run alpha:evidence-check -- --batch Alpha-001 --strict
npm run analytics:miniprogram -- --days=30 --format=markdown --evidence-check --batch Alpha-001 --out research/alpha/reports/Alpha-001-day10.md
npm run analytics:miniprogram -- --days=30 --format=markdown --real-device-evidence --user-quotes --competitor-fieldwork --out research/alpha/reports/Alpha-001-day10.md
```

Before uploading an Experience build, generate the Day 0 preflight report:

```bash
npm run alpha:evidence-pack -- --batch Alpha-001
npm run alpha:evidence-pack -- --batch Alpha-001 --vercel --remote
npm run alpha:preflight -- --out research/alpha/preflight/Alpha-001.md
npm run alpha:preflight -- --vercel --remote --out research/alpha/preflight/Alpha-001.md
```

`alpha:evidence-pack` intentionally does not generate a Day 10 analytics report. Use the analytics commands above only after real users have completed the alpha window.

If you also want to include Vercel Production env names and the remote experience check in the same readiness gate, run `npm run alpha:readiness -- --vercel --remote`.

Before Day 1 internal real-device smoke, generate two phone-session files:

```bash
npm run alpha:phone-session -- --batch Alpha-001 --tester internal-01 --device "iPhone" --wechat "8.x"
npm run alpha:phone-session -- --batch Alpha-001 --tester internal-02 --device "Android" --wechat "8.x"
```

| Metric | Result |
|---|---|
| alphaUsers |  |
| firstCompleteRecordRate |  |
| recordFormStartRate |  |
| recordSaveAttemptRate |  |
| recordSaveSuccessRate |  |
| nextDayReturnRate |  |
| averageRecordDaysInFirst7Days |  |
| weightRecordRate |  |
| contextTagRate |  |
| dashboardViewRate |  |
| trendsViewRate |  |
| payIntentExposureRate |  |
| payIntentRate |  |
| payIntentClickThroughRate |  |
| feedbackRate |  |
| decisionReview.recommendation |  |
| decisionReview.blockers |  |
| decision |  |

## 8. Decision Rule

| Decision | Use When | Next Action |
|---|---|---|
| needs_data | Fewer than 10 users or missing real-device / user quote evidence | Continue the same alpha without changing scope |
| hold_and_improve | Users can start, but retention, record speed, or value quotes are weak | Fix Today / Dashboard / Trends friction before inviting more users |
| beta_candidate | Quantitative gates are met and users can repeat the value in their own words | Plan beta separately; do not jump directly to payment or device sync |

Never treat `continue_candidate` or `beta_candidate` as permission to launch paid features. Payment, subscription messages, new health indicators, and device sync still require separate roadmap approval.
