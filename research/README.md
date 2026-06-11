# Research Materials

This directory keeps validation materials for China-market commercialization and WeChat mini program alpha testing.

Use these files to collect evidence before changing product scope. Do not treat public descriptions or model guesses as completed competitor research.

Generated evidence folders are local-only by default and ignored by Git:

- `research/evidence/`
- `research/alpha/preflight/`
- `research/alpha/phone-sessions/`
- `research/alpha/reports/`
- `research/alpha/private/`

Only commit sanitized templates and summaries. Do not commit raw screenshots, recordings, phone numbers, private chat content, device identifiers, user quotes that can identify a person, AppSecret values, tokens, or database URLs.

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

This output is private local evidence. Paste only a redacted summary into [alpha/ALPHA_BATCH_CONTROL.md](./alpha/ALPHA_BATCH_CONTROL.md).

Generate the local Day 0 / Day 1 evidence pack in one command:

```bash
npm run alpha:evidence-pack -- --batch Alpha-001
```

This creates private local preflight, phone-session, and pack-index files under ignored alpha evidence folders. It intentionally does not generate a Day 10 analytics report; only run the Day 10 report after real users complete the alpha window.

Generate a real-device phone test session note before Day 1 internal smoke:

```bash
npm run alpha:phone-session -- --batch Alpha-001 --tester internal-01
```

This output is private local evidence. Keep screenshots and recordings beside it, but do not commit them.

Generate a Day 10 mini program alpha report after the first user batch:

```bash
npm run analytics:miniprogram -- --days=30 --format=markdown --out research/alpha/reports/Alpha-001-day10.md
```

This output is private local evidence until it has been reviewed and redacted.

If the report cannot reach the database, run:

```bash
npm run db:doctor -- --timeout-ms 5000
```

Preview the markdown layout without database access:

```bash
npm run analytics:miniprogram -- --sample --format=markdown --out /tmp/alpha-sample.md
```

Sample reports are format previews only. They are forced to `needs_data` even if manual evidence flags are passed.
