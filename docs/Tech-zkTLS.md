# Tech-zkTLS — Backend Comparison and Selection

> Horizontal study from the ChatGPT share (2026-08). Used as the current protocol substrate, with notes on what to keep watching.
>
> Compared: Reclaim zkFetch, TLSNotary, zkPass, the3cloud/zktls. Adjacent: vlayer, zkTLS Open Standard, VEFAS.

---

## 1. Why this layer exists

The user asked for a general Web2 evidence that Web3 can verify without human review, then optionally issue credits.

zkTLS is the main way to prove:

```
HTTPS URL
  → real fetch
  → response
  → cryptographic / zk proof
  → third party verifies:
     this response came from this HTTPS endpoint
     and was not tampered with by the caller
```

It is **first-class**, not a later feature. It is also **not the protocol**. The protocol is `EvidenceCredential` + `ProofBackend`.

---

## 2. The trust lesson that must not be lost

Ordinary TLS uses symmetric session keys. The client also knows material related to the session. Therefore:

> "The client extracts TLS plaintext and proves it came from the server"

is **not naturally trustworthy**.

Every mainstream zkTLS design introduces some third party:

```
Notary / Witness / Validator / MPC participant / TEE / Network observer
```

The third party should:

- not see plaintext
- not forge user data
- run automatically
- be decentralizable
- be multi-node
- be checkable on chain

TLSNotary emphasized in 2026:

> Zero Knowledge does not automatically equal Trustless.

Under portable-proof mode, the final verifier still needs to trust **who witnessed this TLS session**.

Correct product language:

- **No Human Verification** — yes, this is the goal
- **No Verifier** — no, do not market this

vlayer's GitHub sample contracts still pin `notaryKeyFingerprint`. ZK compression does not erase notary trust:

```
ZK ≠ automatically trustless
```

---

## 3. Comparison Table

| Dimension | Reclaim zkFetch | TLSNotary | zkPass | the3cloud/zktls |
| --- | --- | --- | --- | --- |
| Core model | Witness/Attestor + zkTLS | MPC-TLS + Notary | 3P-TLS + Validator + ZK | TLS execution inside zkVM |
| HTTP API | ★★★★★ | ★★★★ | ★★★★★ | ★★★ |
| Logged-in web pages | ★★★★★ | ★★★★★ | ★★★★★ | ★★ |
| Browser Extension | yes | yes | core product | not the focus |
| Selective disclosure | yes | yes | yes | programmable, weak ecosystem |
| Onchain verify maturity | high | currently weaker | high | native goal |
| Self-host | partial / inspect components | **strong** | needs further audit | strong |
| License | zk-fetch **AGPL** | **MIT/Apache 2** | SDKs mostly Apache | MIT |
| Decentralization autonomy | medium | **high** | medium | theoretically high |
| Current UX | good | medium | **good** | poor |
| Performance | seconds to tens of seconds | seconds; Proxy faster | official claim can be <1s | minutes |
| Maturity | quite productized | active alpha | quite productized | experimental |
| Best role for us | **MVP adapter** | **long-term base** | **product/schema UX** | long-term research |

---

## 4. Reclaim zkFetch

Repo: `reclaimprotocol/zk-fetch`

Tagline: **fetch, but with a proof.**

```
HTTPS request → Response → Reclaim Witness / Attestor → Proof
```

Can declare separately:

```
public headers
private headers
responseMatches
responseRedactions
```

Authorization, cookie, token can stay out of the final proof.

Also supports **Browser Network Capture**: user browses normally, tool observes requests, auto-generates a Provider. Not only official public APIs — logged-in web requests can be evidence sources.

Example shape:

```
const proof = await client.zkFetch(
  "https://api.example.com/user/profile",
  { method: "GET" },
  { headers: { Authorization: "Bearer SECRET_TOKEN" } }
)
```

Prove: visited that URL, server returned `{ followers: 1324, ... }`, but Authorization and other PII stay private; only `followers > 1000` is disclosed.

EVM contracts exist. Onchain mainly verifies attestor/witness signatures and the valid set — the EVM does not re-execute full TLS.

### Why MVP

Fast; browser and API both work; existing provider ecosystem; existing onchain verify; fastest way to learn if the product has demand.

### Problems

1. **License:** `zk-fetch` is AGPL. Deep-forking it into a closed or even Apache core needs a hard legal boundary. Adapter: yes. Core fork: no.
2. **Independence:** proof credibility still depends on Reclaim witness/attestor architecture.
3. **Rule:** use Reclaim, but **Credential Format ≠ Reclaim Proof Format**.

---

## 5. TLSNotary

Repo: `tlsnotary/tlsn`

Classic problem: **prove a data segment came from a real TLS/HTTPS session.**

Rust core, MIT + Apache 2.0. Browser Extension, WASM, Verifier Server, iOS/Android, plugin model. Code is active.

Default: **MPC-TLS**. Prover and Verifier jointly participate in the TLS session. Verifier:

- does not know Cookie
- does not know the full response
- cannot steal the session
- only sees user-selected disclosure

Notary can sign a transcript commitment so the proof is portable to a third party.

Second mode: **Proxy Mode**. Verifier is on the network path as proxy; after the session, ZK proves the transcript.

2026 benchmarks: Proxy mode in some scenes ~1–2 seconds; classic MPC still seconds to tens of seconds depending on network.

### Why long-term base

- License fit for public infrastructure
- Verifier server can be self-hosted
- Full component set already exists
- Highest autonomy among the four

### Current gaps

- Still marked active development / not production ready
- Today mainly TLS 1.2; TLS 1.3 on roadmap
- Direct Solidity verification of a full TLSNotary proof is not the most mature path yet

**Good as autonomous R&D base. Do not bet v1 on TLSNotary alone.**

---

## 6. zkPass

Product-layer closest to VeriCommons.

Positioning: **Prove anything you can see in your browser.**

Published schema examples: GitHub star/activity, X account, LinkedIn employment, Binance balance, Steam hours, Uber rides, Plaid income, Kaggle rank, age, learning progress.

Architecture:

```
Browser → TransGate → Allocator → Validator
  → 3P-TLS → VOLE-based IZK → Credential
```

Validator joins 3P-TLS, checks the ZK proof, signs the verification result.

**uHash:** stable, privacy-friendly user identifier. Same Web2 user stays correlatable across proofs without exposing raw user id. Directly relevant to our nullifier / subject binding.

Copy these three, not their code:

```
Schema Marketplace
+ Browser Capture UX
+ User Nullifier
```

### Risks

Early docs said network nodes were mostly run by the zkPass team, community nodes later. Public SDKs exist, but before making it the only substrate, audit how open validator / allocator / network cores really are.

2026: `zktls.com` open-standard direction, pushed by zkPass, Rust reference implementation, Apache/MIT. Track this as standardization work.

---

## 7. the3cloud/zktls

Most research-shaped of the four.

Positioning: **Trustless access web2 from web3.**

```
record TLS computation
  → replay inside zkVM
  → RISC Zero / SP1
  → Groth16
  → EVM / Solana / Sui / Aptos / TON verifier
```

Repo includes Solidity contracts. Conceptually closest to "HTTPS task → ZK proof → contract → credits" as a succinct cryptographic proof.

### Why not now

Small benchmark (~56 byte request, ~426 byte response):

```
SP1:   ~175–465 seconds
RISC0: ~282–427 seconds
```

Plus several GB to >10 GB memory. Unfit for "click to prove I starred a GitHub repo".

Repo size and activity are clearly below the other three.

### Why keep watching

Long-term direction:

> Full protocol computation → zkVM → succinct chain proof

Re-evaluate every few years. Do not ignore it.

---

## 8. vlayer — preferred long-term composition

Does not reinvent TLSNotary. Composes:

```
TLSNotary
  → Web Proof
  → RISC Zero
  → Compressed ZK Proof
  → Smart Contract
```

Split two problems:

1. Prove HTTPS data origin is real (TLSNotary).
2. Compress a heavy proof into something Solidity can verify cheaply (zkVM).

**This is the recommended long-term architecture.** Still does not automatically remove notary trust.

---

## 9. Selection for VeriCommons

Not "pick one of four". Define `ProofBackend` on day one.

```
              ProofBackend
        ┌──── Reclaim zkFetch     MVP
        ├──── TLSNotary           long-term self-host
Core ───┼──── zkPass              schema / UX reference
        ├──── PublicWebBackend
        ├──── OnchainBackend
        └──── Future zkVM         the3cloud + vlayer
```

### Production MVP

**Reclaim + our own unified Credential layer.**

Reasons: speed, browser/API, provider ecosystem, onchain verify, fastest demand test.

### Parallel R&D

Run our own **TLSNotary Verifier / Notary**.

This is the step that prevents:

```
Our Protocol = Reclaim API Wrapper
```

### Product/UX

Study zkPass Schema Marketplace, browser capture, uHash. Do not make zkPass the only backend until openness is audited.

### Standardization watch

zkTLS Open Standard (2026, zkPass-associated, Apache/MIT Rust reference).

---

## 10. Where zkTLS cannot help

zkTLS cannot invent an endpoint that does not exist.

Personal WeChat Moments live mainly in a native app, with no stable browser zkTLS web endpoint for "this user posted this item". First stage: **UNSUPPORTED**. Use Referral Result Proof instead.

E2EE messengers (WhatsApp, Signal, private WeChat groups) have no authoritative HTTPS response a third party is allowed to see.

For those, add other Evidence Backends later (see `docs/Technical-Reserves.md`): zkEmail, issuer VC, QR/NFC attendance, mobile TEE — not a hacked zkTLS.

---

## 11. Mapping to Proof Grades

| Grade | Backend role of zkTLS |
| --- | --- |
| A Onchain | not zkTLS |
| B Signed API | zkTLS can replace "our server called GitHub and we promise it is true" |
| C Web Proof | browser zkTLS or public fetch + challenge |
| D AI/Human | not zkTLS |
| E ZK circuits on private attributes | may compose with zkTLS selective disclosure |

The upgrade from round 2:

```
Task
  ├── OnchainVerifier
  ├── zkTLSVerifier   ← Reclaim / TLSNotary, first-class
  ├── APIOracleVerifier
  ├── ZKVerifier
  ├── AIHumanVerifier
  └── CustomVerifier
        → Proof → Attestation → Reward / Credits
```

---

## 12. VEFAS (agent-facing reserve)

Very new adjacent project: generate verifiable zkTLS proofs for an AI Agent's HTTPS request/response, proving the agent actually called an external service rather than claiming it did.

Relevant if VeriCommons later covers **Agent Task Proof**. Track, do not block M0–M3.
