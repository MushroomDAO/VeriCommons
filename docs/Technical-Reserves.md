# Technical Reserves — Adjacent Stack and Future Backends

> Research inventory that is **not** the v0 implementation, but must not be dropped. Covers attestation primitives, EIPs, quest products, OSS ledgers, identity, email, agents, and Cloudflare pieces for the Blog reference app.

---

## 1. How to use this document

- **Build now:** EvidenceCredential, ProofBackend, Reclaim adapter, EvidenceRegistry. See `docs/Plan.md` M0–M3 and `docs/Tech-zkTLS.md`.
- **R&D in parallel:** self-hosted TLSNotary notary/verifier.
- **Borrow shape, not code:** zkPass schema UX, Zealy/Galxe verification pipeline, EAS/Sign attestation.
- **Adopt later:** zkEmail, OpenID4VC, ERC-4337 paymaster, ERC-5192 badges, Human Passport, vlayer compression, VEFAS, mobile TEE.
- **Avoid as core:** Galxe-style quest growth, transferable ERC-20, AGPL fork of zk-fetch, WeChat Moments scraping.

---

## 2. Attestation infrastructure (do not reinvent in MVP)

### Ethereum Attestation Service (EAS)

Very clean:

```
Schema Registry + Attestation Contract + optional Resolver
```

Onchain and offchain attestations. Resolver can hold verification and business logic.

Example schema fields discussed:

```
bytes32 taskId
address claimant
address verifier
bytes32 evidenceHash
uint8 proofType
uint16 score
uint64 issuedAt
uint64 expiresAt
```

Attestation UID = onchain proof that a task (or evidence) completed.

### Sign Protocol

Closer to this product:

```
Schema
Attestation
Schema Hook
Indexing Service
Onchain / IPFS / Arweave
ZK verification
```

Schema Hook runs custom Solidity on create/revoke (whitelist, payment, verify). Real attestations already look like `ProofType / Source / Condition / SourceUserIdHash / Result / Timestamp / UserIdHash`.

ZK verifier can live in a Schema Hook so creating an attestation verifies a ZK proof.

**MVP: compare EAS vs Sign, do not ship a homemade Attestation Registry.** Innovation is Task + Verifier + Reward orchestration and EvidenceCredential.

---

## 3. Ethereum standards to keep

| Standard | Role |
| --- | --- |
| EIP-712 | Structured data signatures for chain-off verifier proofs (`TaskProof` / evidence envelopes) |
| EIP-1271 | Smart-account signature verification (Passkey / 4337 accounts) |
| ERC-4337 + Paymaster | Sponsor gas; Blog users never buy ETH or see gas |
| ERC-5192 | Minimal soulbound NFT on ERC-721; badges bound to an account, non-transferable |
| ERC-6909 | Leaner multi-token than ERC-1155; only if one contract must hold many point assets. **MVP: skip, use CreditLedger mapping** |

Example EIP-712 payload from round 2:

```
TaskProof {
  taskId
  claimant
  verifier
  evidenceHash
  issuedAt
  expiresAt
  nonce
  result
}
```

Flow: `Verifier API → EIP-712 signed Proof → contract verify() → Attestation → Reward`

---

## 4. Onchain module reserves (M7, not M1)

Five contracts, still valid as an optional rewards layer:

1. `TaskRegistry` — store `metadataURI + metadataHash` only
2. `VerifierRegistry` — GithubVerifier, XVerifier, URLVerifier, TelegramVerifier, ZKVerifier, AIReviewVerifier, HumanReviewVerifier
3. Attestation adapter (EAS/Sign)
4. `RewardManager.settle(attestation)`
5. `CreditLedger` — `credit / debit / balanceOf(projectId, user)`

SDK verbs: `createTask → complete → verify → attest → claim → settle → credit`

Credits: **onchain, non-transferable, multi-tenant**. Do not launch ERC-20 in v1 (price, farming, bots, speculation).

Split Credit (spendable) vs Reputation (not spendable) vs Badge (SBT).

Verifier trust path: official whitelist → multiple trusted verifiers → permissionless + stake + challenge + slash.

Verifier Marketplace long-term: GitHub, Telegram, URL, code contribution, AI evaluation, course completion, event check-in, Shopify, Stripe, DAO vote.

Positioning if it grows: Zapier / Chainlink specialized for human/agent action proofs.

---

## 5. zkTLS and compression reserves

Already specified in `docs/Tech-zkTLS.md`. Short list for this inventory:

| Project | Keep as |
| --- | --- |
| Reclaim zk-fetch | MVP adapter; AGPL boundary |
| TLSNotary / tlsn | Long-term self-hosted base; MIT/Apache; TLS 1.3 and Solidity verify still immature |
| zkPass | Schema marketplace, browser UX, uHash; audit node openness before depending |
| zktls.com Open Standard (2026) | Track as industry standard; Apache/MIT Rust reference |
| the3cloud/zktls | zkVM (RISC Zero / SP1) research; minutes-scale today |
| vlayer | TLSNotary → RISC Zero → succinct proof → contract; preferred long-term composition |
| VEFAS | Agent HTTPS request/response proofs; Agent Task Proof later |

---

## 6. Non-HTTPS evidence backends (Milestone 5 of evidence network)

zkTLS is the largest source, not the only one. Later **General Evidence Protocol**:

```
HTTPS / zkTLS
Email / DKIM / zkEmail
Onchain
Issuer VC / OpenID4VC
Device / TEE
Physical issuer signatures (QR / NFC)
```

Rules:

- Native issuer signature > zkTLS scraping
- Email receipts / bookings / employment mail → zkEmail
- Physical attendance → organizer-signed challenge, not GPS-via-zkTLS
- Mobile-only apps → native SDK / OS network extension / TEE / device attestation / OAuth / partnership; do not block v1

---

## 7. Identity and sybil reserves

zkTLS does not prove uniqueness of humans.

Later composition:

```
Web Credential + Identity Credential + Sybil Score → Reward Policy
```

**Human Passport / Gitcoin Passport:** humanity / sybil score 0–100, Action ID for one-action-per-human. Too heavy and wallet-centric for Blog v1. Consider after obvious farming.

zkPass **uHash** is the closer near-term pattern for "same Web2 user, no raw id".

---

## 8. Quest / points products (borrow the pipeline, not the growth loop)

Reuse this abstraction only:

> **Task → Verification → Claim → Reward → Risk Control**

Do not copy Follow / Retweet / Join Discord / Earn XP as the VeriCommons homepage.

### Zealy

Closest mature "quest" UX: Quest, XP, Rewards, Conditions, X, Discord, Telegram, API task, Screenshot, AI Review, Referral, account age, follower count, anti-bot, Proof of Humanity.

X tasks: Follow, Tweet, Like, Reply, Retweet, Quote Tweet (checks connected account and correct referenced tweet).

Useful for: AI review of screenshots (low-value only), condition graphs, referral. Not a Blog Search backend.

### Galxe

X, Discord, Telegram, YouTube, GitHub, on-chain, Loyalty Points, REST, API, GraphQL, Custom Credential.

Important split:

- Non-Authentic Verification = page visit / intent
- Authentic Verification = real X API (costs extra credits)

Confirms: **clicking Share is not verification**. Custom REST/API Credential architecture is worth studying.

### OfferKit

MIT, self-hosted, TypeScript / Next.js / PostgreSQL / Redis. Loyalty, points ledger, referrals, validation rules, audit log, REST API. Borrow Credit + Referral + Ledger ideas. Young; do not make it critical infra.

### RefRef

OSS referral / affiliate, self-hosted, AGPLv3. For this scale, `referral_events + credits ledger` in-house is simpler.

### RabbitHole Quest Protocol

On-chain task → token/NFT. Too Web3 for Blog Search; not the VeriCommons core.

---

## 9. Cloudflare stack for the Blog reference app

Not protocol core. Needed when M7 (or an earlier prototype) runs Digital Commons Blog.

| Piece | Role |
| --- | --- |
| Workers | API, auth, verifiers |
| D1 + FTS5 | Keyword / BM25; no Elasticsearch/Meilisearch required |
| Vectorize | Semantic search. Example cost: 50k vectors, 200k searches/month, 768d ≈ $1.94/month before included quota |
| Workers AI BGE-M3 | Embedding, $0.012 / 1M input tokens |
| BGE Reranker | ~$0.003 / 1M tokens |
| Workers AI LLM | Ask AI / Deep Answer — the expensive part, burns Credits |
| Workers AI Vision | Screenshot OCR; low-value proof only |
| R2 | Screenshot evidence blobs |
| Turnstile | Signup/bot; **server-side** token verify; tokens expire |
| Workers Rate Limiting binding | `user_id` key, anti-burst; permissive / eventually consistent; **not** accounting |
| AI Gateway | Analytics, logging, rate limits, caching, **Spend Limits** (model / provider / user / team / app / metadata) — dollar backstop if app-layer bugs |

Search ranking v1:

```
FTS5 Top 20 + Vectorize Top 20 → RRF → Top 10 → BGE Reranker → Top 5
```

Query Rewrite only for hard queries.

Ledger tables: `users / credit_accounts / credit_transactions / reward_claims / tasks / referrals / referral_events / risk_events`

D1 `batch()` transactional enough for debit + usage record.

Defense line:

```
Turnstile → Account → Worker Rate Limit → Credit Check → AI Gateway Spend Limit → Workers AI
```

Rate limit ≠ credits.

Suggested Blog credit table (starting point, not protocol consensus):

| Action | Credits |
| --- | --- |
| Signup + email verify | +3 |
| Article read | free |
| Keyword search | free or tiny cap |
| Hybrid search | 0–1 |
| AI rerank search | 1 |
| Ask AI / summary | 2 |
| Deep research | 3–5 |
| Qualified referral | +5 |
| Adopted resource | +5 |
| Accepted error fix | +3 |
| Adopted feedback | +2 |

Caps example: referral ≤ 20 credits/day, contribution ≤ 100 credits/month.

Anti-abuse: account + verified email + Turnstile + user-id rate limit + session/browser + IP risk + referral graph + behavior. Prefer user id over IP (NAT, campus, mobile).

---

## 10. UX and account reserves

Target path:

```
Email / Passkey → Smart Account → Address → Evidence → sponsored UserOperation
```

Users see email login and a credit number, never "gas".

Public-web challenge (Proof-of-Publication) remains a simple, decentralized backend even without zkTLS.

---

## 11. Claim compiler references

Long-term moat (`docs/Plan.md` M5):

```
Natural language → source → HTTPS endpoint → auth → JSON fields → predicate → schema → proof
```

Existing signals this is real:

- Reclaim: browser network capture → provider generation
- zkPass: natural language → schema → browser navigation → proof

VeriCommons should own the **compiler + schema registry + credential**, not wrap either vendor as the protocol.

Also needed: **Schema Versioning + Endpoint Health Monitoring** (Spotify 2026 endpoint churn, Reddit Developer Platform migration).

---

## 12. License and commons reserves

- Protocol / SDK / contracts / TLSNotary adapter: **Apache-2.0** (patent grant stronger than MIT for infra)
- RFC / Schema spec: CC BY 4.0 or similar
- VCIP-0001 … 0005 as the EIP-like process
- Invariants: no mandatory token, chain, prover, verifier, vendor lock-in
- Reclaim `zk-fetch`: AGPL — adapter only
- RefRef: AGPLv3 — do not take as core
- TLSNotary: MIT/Apache — preferred to build on

---

## 13. Naming reserves

Chosen: **VeriCommons**.

Avoided collisions: OpenEvidence (medical AI), Open Proof Protocol, WebProof (provenance spec), VeriWeb (academic benchmark 2025–2026), EvidenceMesh (live project).

Backups: Proof Commons (8/10), OpenVerity (7.5/10). Informal name screen only, not trademark clearance.

---

## 14. First-wave schema files (when coding starts)

```
schemas/github/repo-star-v1.json
schemas/github/pr-created-v1.json
schemas/github/pr-merged-v1.json
```

Then Discord, Telegram, X, Public Web. LinkedIn/SaaS wait for browser evidence (M4).
