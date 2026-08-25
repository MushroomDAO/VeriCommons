import { Wallet } from "ethers";
import { createKernel, GITHUB_REPO_STAR_V1 } from "../dist/index.js";

const subject = "0x1111111111111111111111111111111111111111";
const signer = process.env.ISSUER_PRIVATE_KEY
  ? new Wallet(process.env.ISSUER_PRIVATE_KEY)
  : Wallet.createRandom();

const fetchImpl = async (input) => {
  const url = String(input);
  if (url.includes("/user/starred/")) return new Response(null, { status: 204 });
  if (url.includes("api.github.com/user")) {
    return Response.json({ login: "demo" });
  }
  return new Response("unmocked", { status: 599 });
};

const kernel = createKernel({ signer, fetchImpl });
const proof = await kernel.prove({
  schema: GITHUB_REPO_STAR_V1,
  subject,
  params: { owner: "tlsnotary", repo: "tlsn", accessToken: process.env.GITHUB_TOKEN ?? "demo" },
});
const ticket = await kernel.issue(await kernel.verify(proof));

console.log(
  JSON.stringify(
    {
      issuer: ticket.issuer,
      subject: ticket.subject,
      schema: ticket.schema,
      trust: ticket.trust.assumption,
      backend: ticket.proof.backend,
      verifierSet: ticket.proof.verifierSet,
    },
    null,
    2,
  ),
);
