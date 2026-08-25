import { createLocalVerifier } from "@vericommons/kernel";
import { createVerifierServer } from "./server.js";

const token = process.env.VERIFIER_TOKEN;
if (!token) {
  process.stderr.write("VERIFIER_TOKEN is required\n");
  process.exit(1);
}

const port = Number(process.env.VERIFIER_PORT ?? "8787");
const host = process.env.VERIFIER_HOST ?? "127.0.0.1";
const verifier = createLocalVerifier({
  verifierSet: process.env.VERIFIER_SET ?? "vericommons-verifier",
});
const server = createVerifierServer({ verifier, token });
server.listen(port, host, () => {
  process.stdout.write(`vericommons verifier listening on ${host}:${port}\n`);
});
