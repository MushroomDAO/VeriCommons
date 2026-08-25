# Tech stack and vendor winners

Compose from local clones in `vendor/src/` (gitignored). Kernel stays our code.

## What we write

| Piece | Stack |
| --- | --- |
| Kernel + task packages | TypeScript, pnpm workspaces, Node 23+ |
| Ticket | EIP-712 signed Evidence; optional W3C VC profile later |
| Tests | vitest (TS), forge (Solidity) |
| Contracts | Solidity, Foundry; EvidenceRegistry; 4337 validator/paymaster modules |
| Own Public Web prover | Cloudflare Workers or Node fetch; D1 later if needed |
| Official API prover | OAuth + server-side verify |
| Attribution | Our DB/events, not zk |

Do **not** rebuild Task Plaza, credit ledger, or 4337 accounts. Adapters only.

## Winners to clone and steal from (not to become)

See [vendor/README.md](../../vendor/README.md).

| Need | Winner | How we use it |
| --- | --- | --- |
| HTTPS provenance | TLSNotary | Self-host notary (P4/P5) |
| Fast HTTPS adapter | Reclaim zk-fetch | Adapter only (AGPL) |
| Browser no-API | zkPass | Adapter; trust label VENDOR_ZKPASS |
| Email provenance | zkEmail | Adapter; relayer is centralized until we run one |
| Attestation primitive | EAS | Optional anchor of **our** ticket hash |
| Account modules | eth-infinitism account-abstraction | P3 |
| Ticket compression later | vlayer (optional, large) | P5d research, do not block |

## Invariants

1. `issue()` only in `packages/kernel`.
2. Every vendor path sets `trust.assumption`.
3. No AGPL in kernel.
4. Credits and 4337 consume tickets, never vendor proof bytes.
