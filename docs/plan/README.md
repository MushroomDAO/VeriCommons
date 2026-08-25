# Plan and milestones

Canonical product/tech plan for VeriCommons. Architecture diagrams stay in `docs/architecture-full.svg`.

**Protocol position (does not change across phases):**

> We are a **backend-agnostic prove / verify / issue component**.
> We may use our own prover, or someone else's prover and verify.
> **We always `issue()` the entry ticket (credential).**
> External engines are compatible via adapters. Every external path carries an explicit **trust assumption**.

Verify starts **centralized (honest about it)**, then moves to **decentralized**. zkPass and zkEmail are useful adapters, not the trust root.

| Phase | Name | Ships |
| --- | --- | --- |
| [P1](./P1-kernel.md) | Kernel | `packages/kernel`: prove, verify, issue; own API + Public Web provers; trust field |
| [P2](./P2-plaza-credits.md) | Plaza and credits | `packages/task` binds tickets to Task Plaza; credits consume tickets |
| [P3](./P3-4337.md) | ERC-4337 | Account consumes tickets; onchain prover for account facts |
| [P4](./P4-vendor-adapters.md) | Vendor adapters | zkPass / Reclaim / zkEmail / TLSNotary adapters; still our issue() |
| [P5](./P5-decentralized-verify.md) | Decentralized verify | Multi-verifier then N-of-M / onchain check |

Do not skip P1. P2 and P3 can overlap after tickets exist. P4 is optional per task type. P5 does not block plaza launch.

Also: [tech stack](./tech-stack.md) · [Cloud Agent](./cursor-cloud.md) · [vendor clones](../../vendor/README.md)

Old `docs/Plan.md` is a pointer to this directory.
