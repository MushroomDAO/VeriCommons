# `@vericommons/kernel` (P1)

Reusable **prove → verify → issue** kernel. Three interfaces: `Prover`, `Verifier`, `Issuer`. Task Plaza, credits, and ERC-4337 are not in this package.

```ts
import { Wallet } from "ethers";
import { createKernel } from "@vericommons/kernel";

const kernel = createKernel({ signer: new Wallet(process.env.ISSUER_PRIVATE_KEY!) });

const proof = await kernel.prove({
  schema: "github.repo.star.v1",
  subject: "0xAlice",
  params: { owner: "tlsnotary", repo: "tlsn", accessToken },
});
const verified = await kernel.verify(proof);
const ticket = await kernel.issue(verified); // entry ticket; we always issue
```

Production signer is `@vericommons/kms` (AirAccount `POST /kms/SignTypedData`). Production verify can be `@vericommons/verifier` over HTTP (`createKernel({ verifier: new HttpVerifier({ url }) })`).

P1 schemas: `github.repo.star.v1`, `web.publication.challenge.v1`, `attribution.qualified.v1`.

Trust is always set (`SELF` for these three). Vendor adapters are P4.
