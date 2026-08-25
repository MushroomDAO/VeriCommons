import {
  EVIDENCE_VERSION,
  KERNEL_BACKENDS,
  KernelError,
  getSchema,
  hashRawProof,
  type RawProof,
  type VerifiedEvidence,
  type Verifier,
} from "@vericommons/kernel";

export const VERIFIER_TOKEN_HEADER = "x-vericommons-token";

const BACKEND_VALUES = new Set<string>(KERNEL_BACKENDS);
const SOURCE_TYPES = new Set(["https", "onchain", "issuer"]);
const CLOCK_SKEW_SECONDS = 300;

export interface HttpVerifierOptions {
  /** Origin of the verifier process, e.g. http://127.0.0.1:8787 */
  url: string;
  /** Shared secret with the verifier process. Required. */
  token: string;
  fetchImpl?: typeof fetch;
}

/** Client for POST /verify. Implements the kernel Verifier interface. */
export class HttpVerifier implements Verifier {
  private readonly url: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: HttpVerifierOptions) {
    if (!opts.token) {
      throw new KernelError("VERIFY_AUTH", "HttpVerifier requires a shared token");
    }
    this.url = opts.url.replace(/\/+$/, "");
    this.token = opts.token;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async verify(proof: RawProof): Promise<VerifiedEvidence> {
    const res = await this.fetchImpl(`${this.url}/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [VERIFIER_TOKEN_HEADER]: this.token,
      },
      body: JSON.stringify(proof),
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      throw new KernelError("VERIFY_HTTP", `verifier returned non-JSON (${res.status})`);
    }
    if (!res.ok) {
      throw errorFromBody(parsed, res.status);
    }
    return bindVerifiedEvidence(parsed, proof);
  }
}

function errorFromBody(parsed: unknown, status: number): KernelError {
  if (typeof parsed === "object" && parsed !== null) {
    const error = (parsed as { error?: unknown }).error;
    if (typeof error === "object" && error !== null) {
      const rec = error as { code?: unknown; message?: unknown };
      return new KernelError(
        typeof rec.code === "string" ? rec.code : "VERIFY_HTTP",
        typeof rec.message === "string" ? rec.message : `verifier HTTP ${status}`,
      );
    }
  }
  return new KernelError("VERIFY_HTTP", `verifier HTTP ${status}`);
}

/** Reject a remote verify that does not match the proof we sent. */
export function bindVerifiedEvidence(parsed: unknown, proof: RawProof): VerifiedEvidence {
  if (typeof parsed !== "object" || parsed === null) {
    throw new KernelError("VERIFY_HTTP", "verifier response is not an object");
  }
  const raw = parsed as Record<string, unknown>;
  if (raw.brand !== "VerifiedEvidence") {
    throw new KernelError("VERIFY_HTTP", "verifier response is not VerifiedEvidence");
  }
  if (raw.subject !== proof.subject) {
    throw new KernelError("VERIFY_BIND", "verified.subject does not match proof.subject");
  }
  if (raw.schema !== proof.schema) {
    throw new KernelError("VERIFY_BIND", "verified.schema does not match proof.schema");
  }
  if (raw.version !== EVIDENCE_VERSION) {
    throw new KernelError("VERIFY_HTTP", `verified.version must be ${EVIDENCE_VERSION}`);
  }
  if (typeof raw.proof !== "object" || raw.proof === null) {
    throw new KernelError("VERIFY_HTTP", "verified.proof is missing");
  }
  const proofOut = raw.proof as Record<string, unknown>;
  if (proofOut.backend !== proof.backend) {
    throw new KernelError("VERIFY_BIND", "verified.proof.backend does not match proof.backend");
  }
  if (!BACKEND_VALUES.has(String(proofOut.backend))) {
    throw new KernelError("VERIFY_HTTP", "verified.proof.backend is not a known backend");
  }
  if (typeof proofOut.verifierSet !== "string" || proofOut.verifierSet.length === 0) {
    throw new KernelError("VERIFY_HTTP", "verified.proof.verifierSet is missing");
  }
  if (typeof proofOut.hash !== "string" || proofOut.hash.length === 0) {
    throw new KernelError("VERIFY_HTTP", "verified.proof.hash is missing");
  }
  if (typeof proofOut.type !== "string" || proofOut.type.length === 0) {
    throw new KernelError("VERIFY_HTTP", "verified.proof.type is missing");
  }
  if (typeof proofOut.rawProofHash !== "string" || proofOut.rawProofHash !== hashRawProof(proof)) {
    throw new KernelError("VERIFY_BIND", "verified.proof.rawProofHash does not match the sent RawProof");
  }
  if (typeof proofOut.reference !== "string" || proofOut.reference.length === 0) {
    throw new KernelError("VERIFY_HTTP", "verified.proof.reference is missing");
  }
  if (typeof raw.source !== "object" || raw.source === null) {
    throw new KernelError("VERIFY_HTTP", "verified.source is missing");
  }
  const source = raw.source as Record<string, unknown>;
  if (typeof source.origin !== "string" || source.origin.length === 0) {
    throw new KernelError("VERIFY_HTTP", "verified.source.origin is missing");
  }
  if (typeof source.type !== "string" || !SOURCE_TYPES.has(source.type)) {
    throw new KernelError("VERIFY_HTTP", "verified.source.type is not a known source");
  }
  if (typeof raw.issuedAt !== "number" || typeof raw.validUntil !== "number") {
    throw new KernelError("VERIFY_HTTP", "verified timestamps are missing");
  }
  if (typeof raw.nonce !== "string" || raw.nonce.length === 0) {
    throw new KernelError("VERIFY_HTTP", "verified.nonce is missing");
  }
  if (typeof raw.claim !== "object" || raw.claim === null) {
    throw new KernelError("VERIFY_HTTP", "verified.claim is missing");
  }
  if (typeof raw.trust !== "object" || raw.trust === null) {
    throw new KernelError("VERIFY_HTTP", "verified.trust is missing");
  }
  const trust = raw.trust as Record<string, unknown>;
  const schema = getSchema(proof.schema);
  if (trust.assumption !== schema.trust) {
    throw new KernelError("VERIFY_BIND", "verified.trust.assumption does not match the schema");
  }
  if (proofOut.type !== schema.proofType) {
    throw new KernelError("VERIFY_BIND", "verified.proof.type does not match the schema");
  }
  if (source.origin !== schema.source.origin || source.type !== schema.source.type) {
    throw new KernelError("VERIFY_BIND", "verified.source does not match the schema");
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(raw.issuedAt - now) > CLOCK_SKEW_SECONDS) {
    throw new KernelError("VERIFY_HTTP", "verified.issuedAt is outside the allowed clock skew");
  }
  if (raw.validUntil !== raw.issuedAt + schema.ttlSeconds) {
    throw new KernelError("VERIFY_HTTP", "verified.validUntil does not match the schema ttl");
  }
  const { rawProofHash: _rawProofHash, ...restProof } = proofOut;
  return {
    ...raw,
    proof: restProof,
  } as unknown as VerifiedEvidence;
}
