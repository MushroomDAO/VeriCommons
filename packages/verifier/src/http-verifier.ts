import { KernelError, type RawProof, type VerifiedEvidence, type Verifier } from "@vericommons/kernel";

export interface HttpVerifierOptions {
  /** Origin of the verifier process, e.g. http://127.0.0.1:8787 */
  url: string;
  fetchImpl?: typeof fetch;
}

/** Client for POST /verify. Implements the kernel Verifier interface. */
export class HttpVerifier implements Verifier {
  private readonly url: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: HttpVerifierOptions) {
    this.url = opts.url.replace(/\/+$/, "");
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async verify(proof: RawProof): Promise<VerifiedEvidence> {
    const res = await this.fetchImpl(`${this.url}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
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
    const verified = parsed as VerifiedEvidence;
    if (verified.brand !== "VerifiedEvidence") {
      throw new KernelError("VERIFY_HTTP", "verifier response is not VerifiedEvidence");
    }
    return verified;
  }
}
