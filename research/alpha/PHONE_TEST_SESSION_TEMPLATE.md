# Phone Test Session Template

用于研发者本人、内部测试者或真实 alpha 用户的手机真机测试记录。

每次测试复制一份，填入设备、微信版本、API 域名、Git commit 和截图/录屏证据。

## Session Info

- Test date:
- Tester:
- Device:
- OS version:
- WeChat version:
- Mini program AppID:
- Experience build version:
- API domain:
- Git commit:

## Task Checklist

| Task | Steps | Expected Result | Actual Result | Evidence File | Passed | Friction | Severity | Repro Notes |
|---|---|---|---|---|---|---|---|---|
| Login | Open mini program, accept legal terms, complete WeChat login | Enters Today page with valid session |  |  | yes / no |  | P0 / P1 / P2 |  |
| Today record | Enter weight, optional sleep/water/context, save | Save succeeds and completion feedback appears |  |  | yes / no |  | P0 / P1 / P2 |  |
| Dashboard | Tap Dashboard or post-save CTA | Sees today action, weight context, weekly summary |  |  | yes / no |  | P0 / P1 / P2 |  |
| Trends | Open Trends | Sees weight trend, insight, recent records |  |  | yes / no |  | P0 / P1 / P2 |  |
| Me | Open Me page | Sees alpha tasks, report waitlist, feedback, legal links |  |  | yes / no |  | P0 / P1 / P2 |  |
| Pay intent | Tap report waitlist without paying | Intent is recorded, no payment is requested |  |  | yes / no |  | P0 / P1 / P2 |  |
| Feedback | Submit alpha feedback | Feedback succeeds and form state is clear |  |  | yes / no |  | P0 / P1 / P2 |  |
| Export | Tap data export | Export returns data or clear next step |  |  | yes / no |  | P0 / P1 / P2 |  |
| Delete account guard | Tap delete account but stop before final confirmation | Destructive action has explicit confirmation |  |  | yes / no |  | P0 / P1 / P2 |  |

## Stop Conditions

Stop the release if any P0 appears:

- Cannot login with real `wx.login`
- Cannot save a Today record
- Dashboard or Trends cannot load after saving
- Legal pages cannot open
- Account deletion has no confirmation
- Any screen makes medical diagnosis, treatment, or risk claims

## Notes

- Biggest friction:
- User quote:
- Follow-up action:

