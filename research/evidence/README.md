# Evidence Folder Guide

这个目录用于保存微信小程序竞品真机实测证据。

本目录下的真实截图、录屏和样本 notes 默认是本地私有证据，已被 `.gitignore` 忽略。可以提交本 README 和脱敏后的路线结论，但不要提交原始截图、录屏、手机号、私人聊天内容、支付页面个人信息或可识别用户的原话。

每个样本一个子目录，命名格式建议：

```text
YYYY-MM-DD-product-keyword/
```

每个样本至少包含：

```text
01-search.png
02-first-open.mov
03-first-record.mov
04-retention-or-payment.png
notes.md
```

## 文件含义

| 文件 | 内容 |
|---|---|
| `01-search.png` | 微信搜索关键词、搜索结果、产品名称和主体信息 |
| `02-first-open.mov` | 从点击进入到看到第一个核心动作的首开录屏 |
| `03-first-record.mov` | 完成一次核心记录、打卡或目标设置的录屏 |
| `04-retention-or-payment.png` | 会员、报告、提醒、订阅消息、分享、社群、硬件或其他商业化/留存入口 |
| `notes.md` | 使用 `research/templates/wechat-competitor-sample.md` 填写的结构化记录 |

## 证据状态

没有完整证据前，样本状态只能写：

- `todo`
- `incomplete`
- `blocked`

只有 5 个文件都存在，并且 `notes.md` 填完，才能写：

- `verified`

如果遇到手机号、身份证、支付、订阅消息、医疗授权、敏感健康授权，只记录截图和停止点，不继续授权或支付。
