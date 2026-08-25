# Proof Matrix — What Can and Cannot Be Proven

> Inventory requested in the last research round: what HTTPS/zkTLS can prove, what we refuse, what we should prove but cannot yet, and what to do instead.
>
> Decision rule: **digital-world facts first**. Reality-world facts only when an authoritative digital service already returned them over a provable channel.

---

## 1. Five-question gate

A demand is in scope only if most of these are yes:

| Condition | Question |
| --- | --- |
| Source | Is there a trusted Web2 data source? |
| HTTPS | Was the fact returned in an HTTPS response? |
| Authentication | Can we bind it to a specific account? |
| Predicate | Can a machine decide True / False? |
| Freshness | Can we prove the fact existed at the required time? |

All five: excellent fit.

Missing one: need an extra mechanism (challenge, before/after proof, issuer signature, …).

Missing two or more: probably not zkTLS.

Formula:

```
Provable Web Fact
  = Authoritative Source
  × Observable HTTPS Response
  × Subject Binding
  × Deterministic Predicate
  × Freshness
```

Correct platform test:

> When the user obtained this fact, was there an authoritative digital response whose origin can be proven?

- No public API → still possible if the browser sees the response (LinkedIn).
- No observable authoritative response → unsupported (personal WeChat Moments, E2EE).

---

## 2. Semantic boundary

### Can prove

```
At time T,
server S returned data D
for authenticated context U.
```

### Cannot automatically prove

```
D is absolute real-world truth.
```

Protocol word: **Provenance**, not **Universal Truth**.

Also cannot automatically prove:

- the user performed the action *after* joining a campaign (state ≠ action)
- the state still holds 7 days later (persistence is Reward Policy)
- 100 accounts = 100 humans (sybil is a separate identity layer)
- subjective facts ("really likes this", "really finished reading")
- absence ("never posted X")

---

## 3. Capability matrix

| Data / action | zkTLS feasibility | Priority | Route |
| --- | --- | --- | --- |
| GitHub Star / PR / Merge | ★★★★★ | P0 | API + zkTLS |
| GitHub identity / contribution | ★★★★★ | P0 | API + zkTLS |
| X account / post / state | ★★★★★ | P0/P1 | API / Browser |
| Discord membership / role | ★★★★★ | P0 | OAuth / API |
| Telegram membership | ★★★★★ | P0 | Bot API |
| YouTube subscription | ★★★★★ | P0/P1 | OAuth / API |
| Public Blog publication | ★★★★★ | P0 | HTTP challenge |
| Backlink | ★★★★★ | P0 | Public Web Proof |
| Domain ownership | ★★★★★ | P0 | challenge |
| SaaS account state | ★★★★☆ | P1 | Browser zkTLS |
| Course completion | ★★★★☆ | P1 | Browser / API |
| LinkedIn employment | ★★★★☆ | P1 | Browser zkTLS |
| Spotify account state | ★★★★☆ | P1 | OAuth / API |
| Reddit activity | ★★★☆☆ | P1/P2 | API / Browser |
| Instagram / Facebook state | ★★★☆☆ | P2 | API / Browser |
| TikTok account / actions | ★★★☆☆ | P2 | custom |
| Exchange balance | ★★★★★ | P1* | API / Browser |
| Banking account fact | ★★★★☆ | P2* | Browser / Open Banking |
| E-commerce order | ★★★★☆ | P1 | API / Browser |
| Travel booking | ★★★★☆ | P1 | Browser / API |
| Personal WeChat Moments | ★☆☆☆☆ | **do not** | alternative: referral |
| Private WeChat group | ★☆☆☆☆ | **do not** | alternative: referral |
| WhatsApp private message | ★☆☆☆☆ | **do not** | E2EE |
| Signal message | ★☆☆☆☆ | **do not** | E2EE |
| Physical presence | ★☆☆☆☆ | other proof | QR / NFC / issuer |
| "Really finished the article" | ★☆☆☆☆ | do not promise | behavior proxy only |
| "Really likes this content" | ☆☆☆☆☆ | impossible | subjective |
| "Never posted X" | ☆☆☆☆☆ | usually impossible | absence proof |

`*`: technically feasible, higher data / security / compliance bar. MVP does not enter high-risk finance.

---

## 4. Should-do list (in scope)

### GitHub — P0, first complete family

- Star / Fork / Own repository
- PR created / PR merged
- Issue created / Comment created
- Organization membership
- Contribution count
- Repository permissions
- Release published / Package published

Authenticated user star check can return HTTP 204. Best first verifier family.

### X / Twitter — P0/P1

Technically: account exists, account age, post exists, authorship, like, repost, follow, follower count, profile attributes.

X API is pay-per-use (Posts / Users / Likes / Reposts, …). Technical problem is small.

Split:

- **Technically provable** ≠ **platform allows using that proof for incentives**
- Protocol may expose `x.user.follows` / `x.post.exists`
- `Repost → Token Reward` is the Task Creator's policy risk (X: no money or virtual compensation for Post/Follow/Repost/Like/Comment/Reply)
- Protocol stays neutral

### Discord — P0

Server membership, role, user identity; possibly activity via Bot/App. OAuth `guilds.members.read` reads the authorized user's guild member info. `Join community` / `Hold role X` are clean digital proofs.

### Telegram — P0

Bot API is HTTPS. `getChatMember` can query membership/status. For other users, reliable results usually need the bot to be admin of the target chat. Community Membership Proof is a good fit.

### YouTube — P0/P1

OAuth `subscriptions.list` with `mine=true`: subscribed channel X, own channel, video published, playlist state. Whether to reward Subscribe still needs platform policy review.

### Public Blog / Forum / Website — P0

Challenge `0xFA83...`; page must contain domain + challenge; HTTPS fetch verifies. Proves: blog publication, backlink, domain control, docs contribution, forum post, public announcement, project acknowledgement. No platform API. Highly decentralized.

### Spotify — P1

OAuth: followed artists, library, account-related info (`/me/following`). Ideal "state exists in my Web2 account" object. APIs change (Spotify removed/adjusted endpoints in 2026) → Schema Versioning + Endpoint Health Monitoring is future infra.

### LinkedIn — P1, flagship for browser zkTLS

High value: current employer, title, employment history, profile, post ownership, professional identity.

Official API is very locked (member social read is not a casual-dev scope). This is exactly why zkTLS matters: **no open API ≠ unprovable**, if login causes the browser to fetch the fact over HTTPS.

### Reddit — P1/P2

Post, comment, karma, account age, community participation. Reddit is migrating / tightening Data API in 2026 toward its Developer Platform. Keep **Official API Adapter + Browser zkTLS Adapter**. Do not hard-bind one endpoint.

### SaaS / Online Course — P1, large commercial surface later

If after login the page shows: course completed, level = 42, project deployed, subscription active, certification passed, usage > X, workspace membership, account plan → `Browser → HTTPS → zkTLS` is in range.

Future marketplace name is not only Social Verifier Marketplace, but **Web Evidence Schema Registry**.

### Financial / Exchange / Commerce — technical P1, commercially cautious

Technically: bank balance > X, exchange asset > X, trading volume > X, order completed, subscription paid, hotel booking, flight status, Uber rides, purchase history. zkPass has shown Binance / Plaid / Uber-like scenes.

Extra: privacy, financial regulation, security, data retention, liability.

**Technically supported. MVP does not actively enter high-risk finance.**

### Instagram / Facebook / TikTok — P2

Possible via API/Browser/custom, not first-wave schemas.

---

## 5. Will-not-do list (first stage, keep explicit)

### Do not prove

```
"I shared the article to WeChat Moments."
"I posted in a private WeChat group."
"I sent a WhatsApp / Signal message."
```

No ordinary-user official API to read "did this person publish this Moments item". Even without a public API, zkTLS could work **if** the browser could see a stable web endpoint. Personal Moments live in a native app without GitHub/X/LinkedIn-like web endpoints.

Do not spend large engineering effort cracking WeChat.

Screenshots + AI Vision only prove "a picture like this exists", not: own account, actually published, not Photoshop, not deleted immediately, not bot-generated. Unfit as high-value evidence.

### Replace with Referral Result Proof

```
https://example.com/r/0xAlice
  → someone clicks
  → new browser
  → Passkey / signup
  → qualified action
  → Referral Credential
```

```
ReferralProof {
  referrer: Alice
  referredUserNullifier: X
  result: QUALIFIED
}
```

More valuable than "screenshot proves I posted to Moments". Same pattern for private groups: prove outcome (real new user), not the private share action.

Qualified referral must not be `1 click = 1 credit`. Levels: click (0) → real visit (0) → verified signup (pending) → first real use (grant). Detect mutual invites, shared browser/IP/ASN, burst timing, identical paths, instant churn. Keep PENDING until verified; allow REVERSED.

---

## 6. Should prove, but HTTPS/zkTLS is the wrong tool

Do not force these into zkTLS. Add new Evidence Backends later (Milestone 5 in the evidence-network plan / Plan M7-adjacent).

### Email → future `ZK_EMAIL`

Receipts, bookings, employment mail, newsletter, account notifications. Use DKIM / email cryptographic provenance.

Principle: **native issuer signature > zkTLS scraping**.

### Physical event

Do not guess GPS with zkTLS.

```
Organizer → signed QR / NFC challenge → user smart account → Attendance Credential
```

### Diploma / official credential

If the issuer can sign VC / OpenID4VC, do not scrape the university portal with zkTLS.

zkTLS exists for:

> the Web2 service never gave the user a portable credential.

### Mobile-only app

Future `Mobile Evidence Backend`: native SDK, OS network extension, TEE, device attestation, OAuth token, issuer partnership. Must not block v1.

---

## 7. Four protocol pitfalls (repeat in every schema)

### Subject Binding

"Some GitHub account starred the repo" is incomplete. Bind Wallet/Smart Account ↔ Web2 account id ↔ challenge ↔ nullifier.

### Freshness

Today's follow proof cannot be a two-year-old proof. Require `issuedAt / validUntil / nonce / taskContext`.

### State ≠ Action

`following = true` is current state, not "followed after joining the task". May need before+after proofs or campaign-specific challenge data.

### Persistence

`liked = true at T1` ≠ still liked at T1+7d. Continued-state rewards: T1 proof → vesting → T2 re-proof → settle. Reward Policy, not zkTLS.

---

## 8. First-stage product space (do eat this)

Do not chase "prove anything in the real world". Eat:

> **Web2 Account State + Web Activity + Web Achievement + Web Transaction Evidence**

Already includes: developer contribution, social accounts, community identity, professional identity, learning outcomes, SaaS usage, digital-asset state, purchase/subscription records, content publication, referral.

Technical boundary to keep repeating:

> If an authoritative digital service already told the user the fact over HTTPS, we try to let the user take that fact away as their own proof.
