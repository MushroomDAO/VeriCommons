# Changes

## 0.1.7 — 2026-08-25

- Implemented P2 `@vericommons/task`: bind kernel tickets to `taskId`, return PASS/FAIL/PENDING, grant credits with `{ evidenceId, schema, subject, amount }`.
- Demo tasks: GitHub star (immediate) and attribution signup (delayed PENDING then PASS).
- `issue()` stays in `@vericommons/kernel`. Plaza/credits do not parse RawProof.

Possible impact: Task Plaza should call `TaskService.claim()`; credit ledger must not verify TLS.

Build / test:

```bash
pnpm install
pnpm test
pnpm build
```

---

## 0.1.6 — 2026-08-25

- Implemented P1 `@vericommons/kernel`: `prove` / `verify` / `issue` (EIP-712 ticket).
- Schemas with test vectors: `github.repo.star.v1`, `web.publication.challenge.v1`, `attribution.qualified.v1`.
- No `packages/task`, no vendor adapters. Trust is always `SELF` on these paths.

Possible impact: plaza/credits/4337 can start consuming tickets in P2/P3; they must not parse RawProof.

Build / test:

```bash
pnpm install
pnpm test
pnpm build
```

---

## 0.1.5 — 2026-08-25

- Added `docs/plan/` P1–P5: kernel, plaza/credits, 4337, vendor adapters, decentralized verify.
- Cloud vs local: `docs/plan/cursor-cloud.md`.
- Vendor clone script: `vendor/clone.sh` (sources gitignored).

Possible impact: implementation should follow P1 then P2; P5 does not block launch.

---

## 0.1.4 — 2026-08-25

- Merged previous prover/zkTLS/zkPass SVG with the two-layer + 4337 SVG into `docs/architecture-full.svg` so one figure keeps vendor adapters, delayed attribution, kernel/task split, and 4337 arrows.

Possible impact: documentation only.

---

## 0.1.3 — 2026-08-25

- Two-layer split: `packages/kernel` (prove/verify/issue, reusable) vs `packages/task` (plaza). Attribution fact in kernel; task policy in wrapper.
- ERC-4337: consume ticket vs onchain source; no zkTLS inside the account.
- SVG: `docs/architecture-two-layers.svg`

Possible impact: first code should be two directories, not a single VeriCore blob.

---

## 0.1.2 — 2026-08-25

- Added SVG stack: `docs/architecture-stack.svg` (consumers, VeriCore, provers, zkTLS technique vs zkPass vendor, delayed path, trust assumption).
- `docs/Architecture.md`: backend = prover; zkPass adapter trusts their verify-result; delayed attribution is not zkTLS.

Possible impact: documentation only.

---

## 0.1.1 — 2026-08-25

Corrected product position after business-stack clarification.

- Added `docs/Architecture.md`: VeriCore sits between existing Task Plaza and existing credits; zkPass/Reclaim/vlayer are optional engines; immediate vs delayed verification; prove/verify/issue.
- `docs/Plan.md`: first slice is Now/Next; old M4–M7 recorded as TODO, not a 12-month gate.
- `docs/Design.md` / `docs/Features.md`: pointed at Architecture; no longer framed as an industry zkTLS product.
- Naming: format namespace VeriCommons; shipped component VeriCore.

Possible impact: later code should implement VeriCore adapters, not a standalone quest/credits stack.

---

## 0.1.0 — 2026-08-24

Extracted the ChatGPT share conversation into project docs without starting implementation.

Source: https://chatgpt.com/share/6a8c2dc5-8cb0-83ec-a7ac-d9499c22c0a8

### Files

- `docs/Solution.md` — conversation source: four rounds of product convergence, constraints, non-goals
- `docs/Design.md` — Evidence Protocol architecture, credential, backends, UX, protocol/cloud/app split
- `docs/Features.md` — protocol features, evidence families, Blog reference app
- `docs/Plan.md` — canonical M0–M7 roadmap (M0–M3 = first complete version)
- `docs/Tech-zkTLS.md` — Reclaim / TLSNotary / zkPass / the3cloud / vlayer comparison and selection
- `docs/Proof-Matrix.md` — what HTTPS evidence can and cannot prove; WeChat alternative
- `docs/Technical-Reserves.md` — EAS/Sign, EIPs, quest products, Cloudflare blog stack, future backends
- `README.md` — pointer to docs

### Possible impact

Documentation only. No runtime, contract, or SDK behavior yet. Subsequent design and coding should treat `Solution.md` as source and `Plan.md` M0–M1 as the next build slice.
