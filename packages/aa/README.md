# `@vericommons/aa` (P3)

ERC-4337 adapter. Smart accounts **consume** kernel tickets. This package does **not** `issue()`.

- `isUserOpAllowed` — validator / paymaster check (EIP-712 ticket, no zkTLS)
- `isBound` — EIP-1271 / EOA subject binding
- Onchain facts are proven in `@vericommons/kernel` (`onchain.nft.held.v1`)
