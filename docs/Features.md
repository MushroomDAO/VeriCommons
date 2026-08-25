# Features — VeriCore Capability Map

> Current position: [Architecture.md](./Architecture.md). Older protocol-style feature list below is kept as a catalog of **backends we may plug in**, not as a promise to become a public zkTLS platform.

---

## 1. Positioning

For **our** Task Plaza and credit system:

> VeriCore tells the plaza whether a task is done: immediately if a digital proof exists, later if only an attributed result exists.

For task creators:

> Write a schema (what counts as done). Immediate engines or delayed referral both end in the same `PASS | FAIL | PENDING`.

Not in this component: creating tasks, issuing credits, running a zkTLS network.

---

## 2. Protocol Features

### F1. EvidenceCredential

Unified portable credential. All backends emit the same object: subject, source, schema, claim, nullifier, time window, proof reference.

This is the product. Everything else consumes it.

### F2. prove / verify / credential

Minimal developer surface:

```ts
prove(request) → RawProof
verify(proof) → VerifiedEvidence
credential(verified) → EvidenceCredential
```

Apps should not talk to Reclaim or TLSNotary directly.

### F3. ProofBackend plug-in

Replaceable backends without changing Credential format:

- Reclaim zkFetch (MVP)
- TLSNotary (self-hosted long-term)
- Public Web challenge
- Onchain state / logs
- later: zkPass-compatible, zkVM, zkEmail, issuer VC, TEE / device

### F4. Schema Registry

Public, versioned, forkable schemas per fact type (`github.repo.star.v1`, `discord.guild.member.v1`, `web.publication.challenge.v1`, …).

Each schema declares source, request, predicate, privacy redactions, freshness, supported backends, test vectors, security assumptions.

### F5. Subject Binding and Nullifier

Bind Web2 account ↔ Web3 subject without leaking the raw Web2 user id. Stable, privacy-preserving identifier (zkPass `uHash` is the UX reference). Prevents claiming rewards for someone else's Web2 action.

### F6. Freshness and Replay Protection

`issuedAt`, `validUntil`, `nonce`, `taskContext`. Old proofs cannot be reused to farm rewards.

### F7. Selective Disclosure

Authorization headers, cookies, tokens, and unused PII stay out of the final proof. Only the predicate result is disclosed (`starred: true`, `followers > 1000`, `company = X`).

### F8. EvidenceRegistry (onchain)

Register evidence hash / claim hash / schema / subject / validity. Third parties can `hasEvidence()` / `verifyEvidence()` / `revokeEvidence()` without storing full proofs on chain.

### F9. Revocation

Evidence can be revoked when a verifier discovers fraud, expired state, or a disputed attestation.

### F10. Claim / Schema Compiler (later)

Natural language or a captured HTTPS request becomes a schema + predicate + test. This is the intended long-term moat.

### F11. Multi-verifier and later decentralization

Official verifier → multiple trusted verifiers → N-of-M → permissionless registry with challenge. High-value claims can require several independent attestations.

### F12. Optional Rewards Module (`@vericommons/rewards`)

Not the core. After Evidence exists:

```
if evidence.schema == GITHUB_MERGED_PR
   and evidence.claim.repo == "vericommons/core":
     credits.grant(user, 10)
```

Supports Credits, Reputation, Badge (ERC-5192), Access, Token (later, non-goals for v1 transferable ERC-20).

---

## 3. Evidence Families (what the protocol should cover)

Priority follows `docs/Proof-Matrix.md`. Below is the product-facing grouping.

### Family A — Developer contribution (P0, first)

GitHub:

- Star / Fork / Own repository
- PR created / PR merged
- Issue / Comment created
- Organization membership
- Contribution count
- Repository permissions
- Release / Package published

First three shipped in M1: `github.repo.star` / `github.repo.pr.created` / `github.repo.pr.merged`.

GitHub REST can return HTTP 204 for "current user starred this repo". Best first verifier family.

### Family B — Community membership (P0)

- Discord: server membership, role, identity (`guilds.members.read`)
- Telegram: channel/group membership via `getChatMember` (reliable results usually need bot admin)
- Public forum / GitHub README / docs site via HTTP challenge

### Family C — Public Web publication (P0)

No platform API required:

- Blog publication
- Backlink
- Domain control
- Documentation contribution
- Forum post
- Public announcement
- Project acknowledgement

Protocol issues a challenge; page must contain origin + challenge; HTTPS fetch proves content.

### Family D — Social account state (P0/P1, policy-neutral)

X / Twitter: account exists, age, post exists, authorship, like, repost, follow, follower count, profile attributes.

Protocol may support `x.user.follows` and `x.post.exists`. Incentive designers must obey X Developer Policy (no paid/virtual compensation for Post/Follow/Repost/Like/Comment/Reply).

YouTube (OAuth `subscriptions.list mine=true`): subscribed channel, own channel, video published, playlist state. Rewarding Subscribe still needs platform-policy review.

### Family E — Professional / SaaS / Education (P1, Browser zkTLS)

- LinkedIn: employer, title, employment history, profile, post ownership (API is locked down; browser zkTLS is the point)
- Online course: completion, level, certification
- SaaS: subscription active, usage > X, workspace membership, plan
- Spotify: followed artists, library, account state (`/me/following`; APIs change — need schema versioning)

### Family F — Commerce / travel (technical P1, commercially cautious)

E-commerce order, travel booking, Uber rides, subscription paid.

Exchange / banking balances are technically in scope (zkPass has shown Binance / Plaid-like demos) but **MVP does not enter high-risk financial scenes**. Extra privacy, regulation, security, retention, liability.

### Family G — Referral result (P0 for growth, not a zkTLS fact)

Prove "this share produced a qualified new user", not "this user posted to Moments".

```
ReferralProof {
  referrer: Alice
  referredUserNullifier: X
  result: QUALIFIED
}
```

Qualified = not self, real visit, verified signup, first meaningful action.

### Family H — Explicitly out of scope (v1)

- Personal WeChat Moments
- Private WeChat group
- WhatsApp / Signal private messages (E2EE)
- Physical presence (use QR / NFC / issuer signature instead)
- "Really finished reading" / "really likes this" / "never posted X"

---

## 4. Verifier Types (product catalog)

Keep all four original types, plus zkTLS as first-class.

| Verifier | Proves | Trust | Credit / reward quality |
| --- | --- | --- | --- |
| OnchainVerifier | Chain state | Highest | High |
| zkTLSVerifier | Authenticated HTTPS | Cryptographic + notary/witness | High |
| APIOracleVerifier | Official API via our backend | Trusted oracle | High, but we are the trust source |
| PublicWeb / URLVerifier | Challenge + backlink | High for public pages | High |
| AIReviewVerifier | Qualitative work | Declared score | Medium, must label proofType |
| HumanReviewVerifier | Editorial judgment | Named verifier | Medium-high, slow |
| ScreenshotVerifier | Image exists | Low | Low-value only |
| ReferralVerifier | Qualified new user | Result-based | High |

Screenshot + AI Vision is allowed only as low-value evidence. It cannot prove ownership, persistence, or non-fabrication.

---

## 5. Reference App Features (Blog + AI Search)

These are Features of the first application, not of the protocol core.

### User-facing

| Feature | Behavior |
| --- | --- |
| Free reading | All articles public |
| Login | Required for AI features |
| Hybrid Search | Keyword + vector, generous / free for logged-in users |
| Ask AI | 2 Credits |
| Deep Answer | 3 Credits |
| Credit balance in header | `Credits: 7` |
| Earn panel | Invite reader +5, submit resource +5, report error +3, improve article +3 |
| Referral dashboard | Clicks / new readers / verified users / credits earned |
| No share-to-earn wall | No "Share to Twitter/WeChat +3" |

### Operator-facing

- Auth + email verify
- Turnstile (server-side token verify)
- Credit ledger (append-only transactions, pending / granted / reversed)
- Daily / monthly earning caps
- User-id rate limit
- AI Gateway spend limit as dollar backstop
- Referral fraud: mutual invites, same browser/IP/ASN, burst timing, identical paths, instant churn → keep PENDING
- Optional later: Human Passport sybil score

### Search pipeline

```
FTS5 Top 20 + Vectorize Top 20
  → Reciprocal Rank Fusion → Top 10
  → BGE Reranker → Top 5
  → optional Query Rewrite only for hard queries
```

Stack: Cloudflare Workers, D1 FTS5, Vectorize, Workers AI (BGE-M3, reranker, LLM), R2 for screenshot evidence if ever used, AI Gateway.

### Contribution tasks (Blog M3)

- Submit resource / article / repository
- Report technical error
- Improve metadata
- Recommend repository

Each goes Task → Submission → Verification → Reward, but verification should prefer VeriCommons Evidence over screenshots.

---

## 6. Feature Views

### Developer view

1. 10-minute GitHub star proof in the playground
2. Drop-in SDK: request a schema, get EvidenceCredential
3. Verify onchain or offchain
4. Publish a new schema without forking the protocol
5. Later: describe a claim in English, get a schema

### Community / app operator view

1. Define a task by picking a schema + reward policy
2. Users complete the Web2 action in place
3. Evidence is issued without human screenshot review
4. Rewards / access / badges settle from evidence
5. Policy stays off the evidence layer (X/WeChat incentive rules are the operator's problem)

### End-user view (Blog)

1. Read freely
2. Search without fear of burning credits
3. Pay credits only when asking the model
4. Earn credits by bringing real readers or improving the knowledge base
5. Never paste a Moments screenshot

### Protocol / commons view

1. No mandatory token, chain, prover, or verifier
2. Schemas are public infrastructure
3. Backends are swappable
4. Anyone can independently verify a credential
5. Future backends (zkEmail, VC, TEE) enter the same object model

---

## 7. What Must Not Be Built as a Feature

- Share-to-WeChat-Moments verification
- Transferable points token in v1
- Quest wall copied from Zealy/Galxe as the homepage
- "Trustless / no verifier" marketing
- Financial KYC/balance products in MVP
- MetaMask-first onboarding for Blog users
- Binding the protocol to one chain or one zkTLS vendor

---

## 8. Success Criteria by Milestone (product, not engineering)

| When | Users can say |
| --- | --- |
| M1 | I starred a repo, and a third party verified that fact on chain without trusting my screenshot |
| M3 | There is a public list of schemas; GitHub / Discord / Telegram / X / public web facts share one credential format |
| M4 | I logged into LinkedIn in the browser and proved current employer without a public API |
| M5 | I typed a claim in English and got a working schema |
| M7 | The Blog spends/earns AI credits from VeriCommons evidence, and credits can be ripped out without killing the protocol |
