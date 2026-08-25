export { Kernel, createKernel } from "./kernel.js";
export type { KernelOptions } from "./kernel.js";
export { KernelError } from "./errors.js";
export { TrustAssumption, P1_BACKENDS } from "./trust.js";
export type { P1BackendId } from "./trust.js";
export {
  SCHEMAS,
  getSchema,
  GITHUB_REPO_STAR_V1,
  WEB_PUBLICATION_CHALLENGE_V1,
  ATTRIBUTION_QUALIFIED_V1,
} from "./schemas.js";
export {
  TicketIssuer,
  recoverTicketIssuer,
  assertTicketSignature,
} from "./issuer.js";
export { EVIDENCE_TICKET_TYPEHASH, eip712Domain, EVIDENCE_TICKET_TYPES } from "./eip712.js";
export { hashClaim, stableStringify } from "./canonical.js";
export { GithubApiBackend } from "./backends/github-api.js";
export { PublicWebBackend } from "./backends/public-web.js";
export { AttributionBackend } from "./backends/attribution.js";
export type {
  EvidenceClaim,
  EvidenceRequest,
  EvidenceSource,
  EvidenceTicket,
  ProofBackend,
  RawProof,
  SchemaDefinition,
  VerifiedEvidence,
} from "./types.js";
export { EVIDENCE_VERSION } from "./types.js";
