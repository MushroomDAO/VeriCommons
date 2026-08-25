# `@vericommons/task` (P2)

Plaza wrapper around `@vericommons/kernel`. Binds an issued ticket to `taskId` and calls the credit API.

This package does **not** `issue()`. Plaza and credits never parse vendor proofs.

```ts
const result = await tasks.claim({
  taskId: "plaza.github.star.tlsn",
  subject: "0xAlice",
  params: { accessToken },
});
// result.status: PASS | FAIL | PENDING
// credits only see result.creditGrant = { evidenceId, schema, subject, amount }
```

Delayed tasks (WeChat-class) return `PENDING` until attribution is qualified; then the same `kernel.issue()` path yields `PASS`.
