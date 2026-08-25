# P1 — Kernel (prove / verify / issue)

**Goal:** A reusable `packages/kernel` that other packages and other apps can import. No plaza UI. No credits. No 4337 module yet.

## Position

```
Prover (ours or theirs)
  → verify (ours, or trust their SDK)
  → issue() OUR ticket   ← this is the product
```

Ticket fields that must exist from day one:

- `subject` (who)
- `schema` (what fact)
- `claim`
- `issuedAt` / `validUntil` / `nonce`
- `proof.backend` (which prover)
- `proof.verifierSet` (who verified)
- `trust.assumption` (enum, never empty on vendor paths)

Trust enum examples:

- `SELF` — we fetched and checked (Public Web, official API oracle, onchain read)
- `VENDOR_ZKPASS` — we trust zkPass TransGate / validators
- `VENDOR_RECLAIM` — we trust Reclaim attestors
- `VENDOR_ZKEMAIL_RELAYER` — we trust that relayer / prover
- `SELF_TLSNOTARY` — we ran our notary (still a notary, not “no verifier”)

## Own provers in P1 (must)

1. **Official API** — GitHub (or the first plaza-needed API). We call, we sign. Trust: GitHub + our oracle.
2. **Public Web** — fetch URL, challenge + backlink. Open-source, we operate. Trust: SELF.

## Attribution in P1

Kernel evidence type `attribution.qualified`: channel A → subject B had a qualified event. Not zkTLS. Task package in P2 decides whether that ticket completes a task.

## Implementation (0.1.6)

Code: `packages/kernel` (`@vericommons/kernel`).

```bash
pnpm install && pnpm test && pnpm --filter @vericommons/kernel build
```

## Exit

- `prove` / `verify` / `issue` TypeScript API
- Two immediate schemas with test vectors
- One attribution schema
- Kernel usable without `packages/task`
- Vendor adapters **not** required

## Does not include

zkPass, zkEmail, 4337 validator, plaza glue, decentralized notaries.
