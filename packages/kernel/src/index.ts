export { Kernel, createKernel } from "./kernel.js";
export type { KernelOptions } from "./kernel.js";
export { KernelError } from "./errors.js";
export { LocalVerifier, createLocalVerifier } from "./local-verifier.js";
export type { LocalVerifierOptions } from "./local-verifier.js";
export { TrustAssumption, P1_BACKENDS, KERNEL_BACKENDS } from "./trust.js";
export type { P1BackendId, BackendId } from "./trust.js";
export {
  SCHEMAS,
  getSchema,
  GITHUB_REPO_STAR_V1,
  WEB_PUBLICATION_CHALLENGE_V1,
  ATTRIBUTION_QUALIFIED_V1,
  ONCHAIN_NFT_HELD_V1,
} from "./schemas.js";
export {
  TicketIssuer,
  recoverTicketIssuer,
  assertTicketSignature,
  ticketTypedValue,
} from "./issuer.js";
export { EVIDENCE_TICKET_TYPEHASH, eip712Domain, EVIDENCE_TICKET_TYPES } from "./eip712.js";
export { hashClaim, hashRawProof, stableStringify } from "./canonical.js";
export { GithubApiBackend } from "./backends/github-api.js";
export { PublicWebBackend } from "./backends/public-web.js";
export { AttributionBackend } from "./backends/attribution.js";
export { OnchainBackend, encodeOwnerOfResult } from "./backends/onchain.js";
export type {
  EvidenceClaim,
  EvidenceRequest,
  EvidenceSource,
  EvidenceTicket,
  Issuer,
  Prover,
  ProofBackend,
  RawProof,
  RpcReader,
  SchemaDefinition,
  TicketSigner,
  VerifiedEvidence,
  Verifier,
} from "./types.js";
export { EVIDENCE_VERSION } from "./types.js";
