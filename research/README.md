# Research Materials

This directory keeps validation materials for China-market commercialization and WeChat mini program alpha testing.

Use these files to collect evidence before changing product scope. Do not treat public descriptions or model guesses as completed competitor research.

- [WECHAT_COMPETITOR_FIELDWORK.md](./WECHAT_COMPETITOR_FIELDWORK.md): fieldwork kit for testing health, weight, hydration, sleep, and habit mini programs inside WeChat.
- [WECHAT_COMPETITOR_SYNTHESIS.md](./WECHAT_COMPETITOR_SYNTHESIS.md): synthesis table for 8 verified competitor samples.
- [templates/wechat-competitor-sample.md](./templates/wechat-competitor-sample.md): copyable notes template for one competitor sample.
- [evidence/README.md](./evidence/README.md): required folder structure for screenshots, recordings, and sample notes.
- [alpha/ALPHA_BATCH_CONTROL.md](./alpha/ALPHA_BATCH_CONTROL.md): batch control board for mini program alpha release gates, users, evidence, and decisions.
- [alpha/ALPHA_USER_EVIDENCE.md](./alpha/ALPHA_USER_EVIDENCE.md): evidence table for 10-30 real alpha users.
- [alpha/PHONE_TEST_SESSION_TEMPLATE.md](./alpha/PHONE_TEST_SESSION_TEMPLATE.md): phone test session template for internal and real-device checks.

Generate a Day 0 alpha preflight report before uploading an Experience build:

```bash
npm run alpha:preflight -- --out research/alpha/preflight/Alpha-001.md
```

Generate a real-device phone test session note before Day 1 internal smoke:

```bash
npm run alpha:phone-session -- --batch Alpha-001 --tester internal-01
```

Generate a Day 10 mini program alpha report after the first user batch:

```bash
npm run analytics:miniprogram -- --days=30 --format=markdown --out research/alpha/reports/Alpha-001-day10.md
```
