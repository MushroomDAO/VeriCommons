# P2 — Task Plaza and credits

**Goal:** Downstream systems consume **our tickets**, not raw zkPass/Reclaim blobs.

## Upstream: Task Plaza (already exists)

Plaza creates tasks (condition = kernel schema + policy). User claims a task. Plaza calls `packages/task`:

```
taskId + subject + schema
  → kernel.prove/verify/issue  (or reuse an existing ticket)
  → PASS | FAIL | PENDING
```

Plaza never talks to zkPass. If verify is PENDING (WeChat-class), plaza shows waiting; when attribution qualifies, same `issue()` then PASS.

## Downstream: credits (already exists)

Credit grant/debit takes:

```
evidenceId + schema + subject + amount
```

Only after `status === PASS` and the ticket is unspent for this taskId (caps, expiry). Credits do not re-verify TLS. They trust **our issuer**.

If credits later need on-chain settlement, they check ticket hash / issuer signature (P3 registry), still not a vendor proof.

## `packages/task` owns

- Bind ticket ↔ `taskId`
- Caps, window, one-time
- PENDING for delayed tasks
- Hook into existing credit API

## Implementation (0.1.7)

Code: `packages/task` (`@vericommons/task`). Calls `kernel.prove/verify/issue` or reuses a signed ticket. Credits receive only `{ evidenceId, schema, subject, amount }`.

```bash
pnpm install && pnpm test && pnpm build
```

## Exit

- One immediate plaza task (e.g. GitHub star) grants credits
- One delayed plaza task (channel id) goes PENDING then grants credits
- Kernel still importable without plaza
