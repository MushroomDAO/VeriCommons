# `@vericommons/contracts` (P3)

Foundry contracts for ticket consumption on ERC-4337 accounts.

- `EvidenceTicketValidator` — UserOp allowed iff our EIP-712 ticket is valid (or anchored)
- `EvidenceRegistry` — optional hash anchor (`hasEvidence`)
- `SubjectBinder` — EIP-1271 / EOA bind

Does not verify zkTLS. Account implementation stays outside this repo.
