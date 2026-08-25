import { KernelError, type RawProof, type VerifiedEvidence, type Verifier } from "@vericommons/kernel";

export const VERIFIER_TOKEN_HEADER = "x-vericommons-token";

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
      const err = parsed as { error?: { code?: string; message?: string } };
      throw new KernelError(
        err.error?.code ?? "VERIFY_HTTP",
        err.error?.message ?? `verifier HTTP ${res.status}`,
      );
    }
    return bindVerifiedEvidence(parsed, proof);
  }
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
  if (typeof raw.proof !== "object" || raw.proof === null) {
    throw new KernelError("VERIFY_HTTP", "verified.proof is missing");
  }
  const proofOut = raw.proof as Record<string, unknown>;
  if (proofOut.backend !== proof.backend) {
    throw new KernelError("VERIFY_BIND", "verified.proof.backend does not match proof.backend");
  }
  if (typeof raw.version !== "string") {
    throw new KernelError("VERIFY_HTTP", "verified.version is missing");
  }
  if (typeof raw.issuedAt !== "number" || typeof raw.validUntil !== "number") {
    throw new KernelError("VERIFY_HTTP", "verified timestamps are missing");
  }
  if (typeof raw.nonce !== "string" || typeof proofOut.hash !== "string") {
    throw new KernelError("VERIFY_HTTP", "verified nonce or proof.hash is missing");
  }
  if (typeof raw.claim !== "object" || raw.claim === null) {
    throw new KernelError("VERIFY_HTTP", "verified.claim is missing");
  }
  if (typeof raw.trust !== "object" || raw.trust === null) {
    throw new KernelError("VERIFY_HTTP", "verified.trust is missing");
  }
  const trust = raw.trust as Record<string, unknown>;
  if (typeof trust.assumption !== "string" || trust.assumption.length === 0) {
    throw new KernelError("VERIFY_HTTP", "verified.trust.assumption is missing");
  }
  return raw as unknown as VerifiedEvidence;
}
