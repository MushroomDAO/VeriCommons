# VeriCommons

**Backend-agnostic `issue()` of a credential you can customize, on top of open-source prove/verify whose default verify is a decentralized network of at least three verifier nodes (2-of-3, then one ticket).** We are the issuer; engines are pluggable; verify is not a single company's check.

We ship this for our Task Plaza, and as a kernel other apps can import.

![Decentralized verify: three operators, one issue](docs/architecture-dvt.svg)

## Positioning (honest)

| When | Claim | What held / what did not |
| --- | --- | --- |
| Solution draft | “Open infrastructure for verifiable digital evidence” / industry zkTLS public good | Too wide. We do not run a zkTLS network, and we already have a plaza + credits. |
| After the stack clarification | VeriCore = middle box: plaza asks “done?”, we return a ticket | Accurate for our business. Too quiet about reuse and about verify becoming a network. |
| Now | Customizable `issue()` + open prove/verify + ≥3-node verify as a core feature | Right unique value. **The three verifier operators are the product thesis, not live in this repo yet** (P5). Today one process runs `verify()` and still `issue()`s the ticket. |

Do not sell “we already are a three-node DVT”. Sell “issue is the product, verify is specified as ≥3 nodes, kernel is usable before the network exists.”

## Happy path (what you can run today)

Single issuer, our provers, same ticket plaza/4337 will consume. That is the path to ship against. DVT is extra hosts of `verify()`, not a different ticket.

### 1. Install and check

```bash
git clone git@github.com:MushroomDAO/VeriCommons.git
cd VeriCommons
pnpm install
pnpm test
pnpm build
```

Node 22+. Foundry (`forge`) for contracts.

### 2. Issue one ticket (kernel)

```bash
pnpm happy-path
```

This builds `@vericommons/kernel` and prints a GitHub-star ticket (`trust=SELF`). Swap the mock fetch for a real `GITHUB_TOKEN` when you wire production.

In your app:

```ts
import { Wallet } from "ethers";
import { createKernel } from "@vericommons/kernel";

const kernel = createKernel({ signer: new Wallet(process.env.ISSUER_PRIVATE_KEY!) });
const proof = await kernel.prove({
  schema: "github.repo.star.v1",
  subject: userAddress,
  params: { owner: "tlsnotary", repo: "tlsn", accessToken },
});
const ticket = await kernel.issue(await kernel.verify(proof));
```

Keep `ISSUER_PRIVATE_KEY` on the issuer host only for local tests. Production uses AirAccount KMS:

```ts
import { createKernel } from "@vericommons/kernel";
import { airAccountSignerFromEnv } from "@vericommons/kms";
import { HttpVerifier } from "@vericommons/verifier";

const kernel = createKernel({
  signer: airAccountSignerFromEnv(),
  verifier: process.env.VERIFIER_URL
    ? new HttpVerifier({ url: process.env.VERIFIER_URL })
    : undefined,
});
```

Run the verifier as its own process: `pnpm --filter @vericommons/verifier start`. Env: see `.env.example`.

### 3. Plug Task Plaza (our ecosystem)

Plaza does not call GitHub or zkPass. It calls `TaskService.claim`. Credits only take `{ evidenceId, schema, subject, amount }` after `PASS`.

```ts
import { createKernel } from "@vericommons/kernel";
import {
  TaskService,
  DEMO_POLICIES,
  GITHUB_STAR_TASK_ID,
  InMemoryCreditLedger,
  InMemoryTaskStore,
} from "@vericommons/task";

const kernel = createKernel({ signer });
const tasks = new TaskService({
  kernel,
  expectedIssuer: await signer.getAddress(),
  ledger: yourCreditLedger, // or InMemoryCreditLedger while integrating
  store: new InMemoryTaskStore(),
  policies: DEMO_POLICIES,
});
const result = await tasks.claim({
  taskId: GITHUB_STAR_TASK_ID,
  subject: userAddress,
  params: { accessToken },
});
// PASS → grant credits from result.creditGrant
// PENDING → wait; attribution.qualified then claim again
```

Deploy: one Node/Worker service with the issuer key + this `claim` API next to the existing plaza. Do not deploy three plazas.

### 4. Optional: 4337 consume the same ticket

```ts
import { isUserOpAllowed } from "@vericommons/aa";
isUserOpAllowed({ sender: account, ticket, expectedIssuer, now });
```

On-chain: `forge test` in `packages/contracts`, then deploy `EvidenceTicketValidator` + `EvidenceRegistry` with the same issuer address. UserOp is allowed iff the ticket is valid. No zkTLS in the UserOp.

### 5. Not this happy path (yet)

Three verifier operators, 2-of-3, then `issue()`: [Ecosystem](docs/Ecosystem.md). P4 vendor adapters (zkPass/Reclaim) are not in the path above; until then use our API / Public Web / onchain backends.

## Packages

| Package | Role | Required to reuse the kernel? |
| --- | --- | --- |
| [`packages/kernel`](packages/kernel) | `prove` / `verify` / `issue` (`Prover` / `Verifier` / `Issuer`) | **Public core** |
| [`packages/kms`](packages/kms) | AirAccount online KMS `TicketSigner` | No (tests may use a local Wallet) |
| [`packages/verifier`](packages/verifier) | Independent HTTP `Verifier` | No (default is in-process `LocalVerifier`) |
| [`packages/task`](packages/task) | `taskId` → PASS / FAIL / PENDING, credit hook | No |
| [`packages/aa`](packages/aa) | Off-chain 4337 gate + EIP-1271 bind | No |
| [`packages/contracts`](packages/contracts) | Validator, registry, subject bind | No |

## Status

| Phase | What | PR |
| --- | --- | --- |
| P1 | Kernel | on `main` |
| P2 | Plaza wrapper | open — do not self-merge |
| P3 | 4337 + onchain prover | stacked on P2 |
| P4 | Vendor adapters | not started |
| P5 | Run ≥3-node verify | not started |
| T1–T3 | Production: hosted issuer → live ledgers → vendors/DVT | [plan](docs/plan/T-production.md) |

- [Architecture](docs/Architecture.md) · [full stack](docs/architecture-full.svg)
- [Ecosystem / DVT](docs/Ecosystem.md) · [DVT diagram](docs/architecture-dvt.svg)
- [Milestones](docs/plan/README.md) · [Production TODO](docs/plan/T-production.md) · [Changes](docs/Changes.md)
- [Solution](docs/Solution.md) (do not overwrite)
