# Vendor winners (local clones)

Selected reference stacks to **compose**, not to replace `packages/kernel`.

Clones live in `vendor/src/` (gitignored). Run:

```bash
bash vendor/clone.sh
```

| Dir | Repo | Role |
| --- | --- | --- |
| `zk-fetch` | reclaimprotocol/zk-fetch | HTTPS proof adapter (AGPL — do not fork into kernel) |
| `tlsn` | tlsnotary/tlsn | Self-host TLS notary |
| `eas-contracts` | ethereum-attestation-service/eas-contracts | Optional on-chain ticket hash |
| `account-abstraction` | eth-infinitism/account-abstraction | ERC-4337 modules |
| `zk-email-verify` | zkemail/zk-email-verify | Email provenance adapter |

zkPass has no single “drop-in kernel” we vendor here; integrate via their SDK in P4 and label `VENDOR_ZKPASS`.
