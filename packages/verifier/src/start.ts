import { createLocalVerifier } from "@vericommons/kernel";
import { createVerifierServer } from "./server.js";

const port = Number(process.env.VERIFIER_PORT ?? "8787");
const verifier = createLocalVerifier({
  verifierSet: process.env.VERIFIER_SET ?? "vericommons-verifier",
});
const server = createVerifierServer({ verifier });
server.listen(port, () => {
  process.stdout.write(`vericommons verifier listening on ${port}\n`);
});
