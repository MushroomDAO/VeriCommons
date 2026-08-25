import { assertNoSecrets } from "../canonical.js";
import { KernelError } from "../errors.js";
import { WEB_PUBLICATION_CHALLENGE_V1 } from "../schemas.js";
import type { EvidenceClaim, EvidenceRequest, ProofBackend, RawProof } from "../types.js";
import type { FetchLike } from "./github-api.js";

export class PublicWebBackend implements ProofBackend {
  readonly id = "public-web" as const;

  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async prove(request: EvidenceRequest): Promise<RawProof> {
    const url = requiredString(request.params, "url");
    const challenge = requiredString(request.params, "challenge");
    const requiredBacklink = requiredString(request.params, "requiredBacklink");
    const origin = new URL(url).host;

    const res = await this.fetchImpl(url, {
      headers: { "User-Agent": "vericommons-kernel" },
    });
    const body = await res.text();
    const payload = {
      url,
      origin,
      httpStatus: res.status,
      challenge,
      requiredBacklink,
      challengeFound: body.includes(challenge),
      backlinkFound: body.includes(requiredBacklink),
    };
    assertNoSecrets(payload);

    return {
      schema: request.schema,
      subject: request.subject,
      backend: this.id,
      observedAt: Math.floor(Date.now() / 1000),
      payload,
    };
  }

  async verify(proof: RawProof): Promise<{
    claim: EvidenceClaim;
    reference: string;
    hashMaterial: Record<string, unknown>;
  }> {
    if (proof.schema !== WEB_PUBLICATION_CHALLENGE_V1) {
      throw new KernelError("SCHEMA", "public-web backend only verifies web.publication.challenge.v1");
    }
    const url = stringField(proof.payload, "url");
    const origin = stringField(proof.payload, "origin");
    const httpStatus = numberField(proof.payload, "httpStatus");
    const challenge = stringField(proof.payload, "challenge");
    const requiredBacklink = stringField(proof.payload, "requiredBacklink");
    const challengeFound = boolField(proof.payload, "challengeFound");
    const backlinkFound = boolField(proof.payload, "backlinkFound");

    if (httpStatus < 200 || httpStatus >= 300) {
      throw new KernelError("WEB_STATUS", `public page returned ${httpStatus}`);
    }
    if (!challengeFound) {
      throw new KernelError("WEB_CHALLENGE", "challenge string not found on page");
    }
    if (!backlinkFound) {
      throw new KernelError("WEB_BACKLINK", "required backlink not found on page");
    }

    return {
      claim: {
        url,
        origin,
        challenge,
        requiredBacklink,
        published: true,
      },
      reference: `web:${url}`,
      hashMaterial: { url, origin, httpStatus, challenge, requiredBacklink },
    };
  }
}

function requiredString(params: Record<string, unknown>, key: string): string {
  const value = params[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new KernelError("PARAM", `missing ${key}`);
  }
  return value;
}

function stringField(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== "string") {
    throw new KernelError("PROOF", `payload.${key} must be a string`);
  }
  return value;
}

function numberField(payload: Record<string, unknown>, key: string): number {
  const value = payload[key];
  if (typeof value !== "number") {
    throw new KernelError("PROOF", `payload.${key} must be a number`);
  }
  return value;
}

function boolField(payload: Record<string, unknown>, key: string): boolean {
  const value = payload[key];
  if (typeof value !== "boolean") {
    throw new KernelError("PROOF", `payload.${key} must be a boolean`);
  }
  return value;
}
