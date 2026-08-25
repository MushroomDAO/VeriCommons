import type { BackendId, TrustAssumption } from "./trust.js";

export const EVIDENCE_VERSION = "0.1" as const;

export type SourceType = "https" | "onchain" | "issuer";

export interface EvidenceSource {
  origin: string;
  type: SourceType;
}

export interface EvidenceRequest {
  schema: string;
  subject: string;
  params: Record<string, unknown>;
}

export interface RawProof {
  schema: string;
  subject: string;
  backend: BackendId;
  observedAt: number;
  payload: Record<string, unknown>;
}

export interface EvidenceClaim {
  [key: string]: unknown;
}

export interface VerifiedEvidence {
  readonly brand: "VerifiedEvidence";
  version: typeof EVIDENCE_VERSION;
  subject: string;
  source: EvidenceSource;
  schema: string;
  claim: EvidenceClaim;
  issuedAt: number;
  validUntil: number;
  nonce: string;
  proof: {
    type: string;
    backend: BackendId;
    verifierSet: string;
    hash: string;
    reference: string;
    /** Digest of the RawProof that was verified. Stripped before signing tickets. */
    rawProofHash: string;
  };
  trust: {
    assumption: TrustAssumption;
  };
}

export interface EvidenceTicket extends Omit<VerifiedEvidence, "brand" | "proof"> {
  proof: Omit<VerifiedEvidence["proof"], "rawProofHash">;
  issuer: string;
  signature: string;
}

export interface SchemaDefinition {
  id: string;
  source: EvidenceSource;
  backend: BackendId;
  proofType: string;
  trust: TrustAssumption;
  ttlSeconds: number;
}

export interface ProofBackend {
  readonly id: BackendId;
  prove(request: EvidenceRequest): Promise<RawProof>;
  verify(proof: RawProof): Promise<{
    claim: EvidenceClaim;
    reference: string;
    hashMaterial: Record<string, unknown>;
  }>;
}

export interface IssuerClock {
  now(): number;
}

/** Relayer / indexer read. Contracts do not fetch HTTPS. */
export interface RpcReader {
  ethCall(to: string, data: string): Promise<string>;
}

/** Standard surface: three roles, three processes if you want. */
export interface Prover {
  prove(request: EvidenceRequest): Promise<RawProof>;
}

export interface Verifier {
  verify(proof: RawProof): Promise<VerifiedEvidence>;
}

export interface Issuer {
  issue(verified: VerifiedEvidence): Promise<EvidenceTicket>;
}

/** Local wallet or external KMS. Kernel never requires a raw key on disk. */
export interface TicketSigner {
  getAddress(): Promise<string>;
  signTypedData(
    domain: {
      name?: string;
      version?: string;
      chainId?: number | bigint;
      verifyingContract?: string;
    },
    types: Record<string, Array<{ name: string; type: string }>>,
    value: Record<string, unknown>,
  ): Promise<string>;
}
