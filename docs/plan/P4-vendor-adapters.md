# P4 — Vendor adapters (centralized verify, labeled)

**Goal:** Plug zkPass / Reclaim / zkEmail / TLSNotary as **provers** (and sometimes as their verify). **issue() stays ours.**

Your doubt is correct: **zkPass validators and typical zkEmail relayers are centralized.** Using them in P4 is allowed only if the ticket says so.

## Adapter contract

```
their proof
  → their SDK verify()     // we do not re-run TLS / DKIM circuit unless we self-host
  → map to our claim
  → issue({ verifierSet, trust.assumption: VENDOR_* })
```

If their SDK is down, that backend is down. Plaza/credits still only see our ticket.

## What to take from which winner (see `vendor/`)

| Winner | Use as | Trust label |
| --- | --- | --- |
| Our Public Web / API | default | SELF |
| TLSNotary | self-host notary when we want TLS proofs we operate | SELF_TLSNOTARY (notary still exists) |
| Reclaim zk-fetch | fast HTTPS proofs; AGPL — adapter only, no core fork | VENDOR_RECLAIM |
| zkPass | browser / no-API pages; TransGate | VENDOR_ZKPASS |
| zkEmail | email-origin facts (receipts) | VENDOR_ZKEMAIL_RELAYER until we run our own |
| EAS | optional on-chain hash of our ticket | not a prover |
| account-abstraction | P3 modules | not a prover |

## Product rule

Task creators see the trust label. High-value credits should prefer `SELF` or later P5 quorum, not a single vendor.

## Exit

- At least one vendor adapter in production behind a flag
- Docs and ticket JSON always include `trust.assumption`
- Kernel core still Apache-2.0; no AGPL inside `packages/kernel`
