# Changes

## 0.1.13 — 2026-08-25

- Review fixes: bind remote `VerifiedEvidence` to the sent `RawProof`; recover KMS signature against `issuerAddress`; sign fallback `verifierSet` before returning the ticket; verifier listens on `127.0.0.1` and requires `VERIFIER_TOKEN`.
- T1.1 checkbox reverted: client exists, live AirAccount round-trip is not yet proven.
- Codex review: catch malformed request targets (no unauthenticated crash); reject empty `verifierSet` / unknown trust labels; map non-object JSON error bodies to `KernelError`.
- Codex round 2: bind remote verify to `hashRawProof(RawProof)`; require `source` and `proof.reference`.
- Codex round 3: require schema-declared `trust.assumption`; keep `rawProofHash` on the HTTP envelope only, not on signed tickets.
- Codex round 4: headless KMS signer requires agent JWT (no WebAuthn path).
- Codex round 5: remote timestamps must match schema ttl and clock skew; proof.type/source must match the schema; EIP-712 primary type is the unique root, not insertion order.
- Codex round 6: verifier result must attest `rawProofHash`; the HTTP wrapper validates it and does not overwrite a stale result.
- Codex round 7: HttpVerifier keeps the attested hash so a proxy server can re-check it; remote backend must match `schema.backend`; KMS chain IDs above `Number.MAX_SAFE_INTEGER` are encoded as strings.
- Codex round 8: `VerifiedEvidence.proof.rawProofHash` is required (tickets still omit it); KMS 2xx `null` bodies become `KmsError`.
- Codex round 9: reject EIP-712 chain IDs that cannot be JSON integers; AirAccount SignTypedData does not accept quoted decimal strings.

Possible impact: `HttpVerifier` now requires `token`. Verifier process requires `VERIFIER_TOKEN` and defaults to loopback.

---

## 0.1.12 — 2026-08-25

- T1.1: `@vericommons/kms` signs EvidenceTicket via AirAccount online KMS (`POST /kms/SignTypedData`, `x-api-key` + optional agent JWT). Kernel `TicketSigner` — no raw issuer key on disk.
- Standard interfaces: `Prover` / `Verifier` / `Issuer`. Kernel `verify()` is injectable.
- Independent `@vericommons/verifier` service (`GET /health`, `POST /verify`) + `HttpVerifier` client. Prove and issue stay in other processes.
- GitHub verify still checks the `RawProof` payload (token is stripped at prove); full independent re-fetch is not this slice.

Possible impact: production issuer should use `AirAccountKmsSigner` and optionally `HttpVerifier`. Local `Wallet` still works for tests. T1.2 auth gateway is next.

Build / test:

```bash
pnpm install
pnpm test
pnpm build
pnpm --filter @vericommons/verifier start
```

---

## 0.1.11 — 2026-08-25

- Production TODO as T1–T3 layered slices: hosted issuer (KMS, auth, replay, audit, independent verify), live credits/4337 + more GitHub schemas, then P4/P5. See `docs/plan/T-production.md`.

Possible impact: documentation only. Implement T1.1 next, not T3 first.

---

## 0.1.10 — 2026-08-25

- README: honest comparison of old vs current positioning; happy path (install, `pnpm happy-path`, plaza `claim`, optional 4337).
- Kernel example: `packages/kernel/examples/happy-path.mjs`.

Possible impact: documentation and a local demo script only.

---

## 0.1.9 — 2026-08-25

- Fixed `docs/architecture-dvt.svg` (invalid control characters broke preview). README now embeds the image.
- README unique value: backend-agnostic customizable `issue()`, open-source prove/verify, verify as ≥3-node DVT.

Possible impact: documentation only.

---

## 0.1.8 — 2026-08-25

- Implemented P3 ERC-4337 adapters: `EvidenceTicketValidator` (UserOp allowed iff our ticket is valid), `EvidenceRegistry`, EIP-1271 `SubjectBinder`.
- Kernel `OnchainBackend` + schema `onchain.nft.held.v1` (relayer reads chain, `issue()` stays in kernel, trust `SELF`).
- `@vericommons/aa` off-chain gate uses the same ticket type as plaza/credits. No zkTLS in UserOp.
- README + `docs/Ecosystem.md`: public kernel vs plaza packs; how others issue their own credentials; 2-of-3 verifier operators then one `issue()`.

Possible impact: existing 4337 accounts should call the validator/paymaster adapter; do not verify vendor proofs on-chain.

Build / test:

```bash
pnpm install
pnpm test
pnpm build
```

---

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
