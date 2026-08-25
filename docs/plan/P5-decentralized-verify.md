# P5 — Decentralized verify (product + tech)

**Goal:** Verify becomes **trustworthy enough to not depend on one company**. This is the long verify roadmap. P1–P4 may ship with centralized verify.

zkPass / zkEmail being “zk” does **not** mean trustless. ZK compresses or hides; **someone still witnessed the TLS or the mailbox**. That is why P5 exists.

## Product stages (do in order)

| Step | What users get | Trust |
| --- | --- | --- |
| P1–P4 | Tasks work | One operator (us or a vendor), labeled |
| P5a | Same ticket, two independent verifies | Honest majority of a **named** set (us + self-hosted TLSNotary, or two vendors) |
| P5b | Random assignment, 2-of-3 | Collusion harder |
| P5c | Permissionless verifier registry + challenge | Economic / social slash later — do not start with a token |
| P5d | Succinct proof the contract checks | Less live quorum (vlayer-style compression). Notary trust may remain; document it |

## Tech stages

1. **Verifier interface** already in P1 (`verify()` + `verifierSet`).
2. **Multi-verify in kernel:** `verifyAll(proof, [v1, v2])` → ticket lists all verifierSets.
3. **Self-hosted TLSNotary** so one of the two is not zkPass Inc.
4. **On-chain registry** of verifier keys (P3 EvidenceRegistry extended).
5. **N-of-M** for high-value schemas only (credits above a threshold).
6. Optional later: stake/challenge. Optional later: zkVM compression.

## What we will not claim

- “No verifier”
- “zkPass = decentralized because ZK”
- “zkEmail = trustless because DKIM” (Gmail still signed the mail; a relayer often built the proof)

## Exit for “first decentralized”

- One high-value schema requires 2-of-3 named verifiers
- Ticket fails closed if quorum missing
- Plaza/credits unchanged: they still only consume **our** issue()
