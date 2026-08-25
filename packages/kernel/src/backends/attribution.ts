import { assertNoSecrets } from "../canonical.js";
import { KernelError } from "../errors.js";
import { ATTRIBUTION_QUALIFIED_V1 } from "../schemas.js";
import type { EvidenceClaim, EvidenceRequest, ProofBackend, RawProof } from "../types.js";

/**
 * Delayed attribution is not zkTLS.
 * Channel of A → subject B had a qualified event. Task policy stays in packages/task (P2).
 */
export class AttributionBackend implements ProofBackend {
  readonly id = "attribution" as const;

  async prove(request: EvidenceRequest): Promise<RawProof> {
    const channelId = requiredString(request.params, "channelId");
    const event = requiredString(request.params, "event");
    const qualified = request.params.qualified === true;
    const payload = {
      channelId,
      event,
      qualified,
      referredSubject: request.subject,
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
    if (proof.schema !== ATTRIBUTION_QUALIFIED_V1) {
      throw new KernelError("SCHEMA", "attribution backend only verifies attribution.qualified.v1");
    }
    const channelId = stringField(proof.payload, "channelId");
    const event = stringField(proof.payload, "event");
    const referredSubject = stringField(proof.payload, "referredSubject");
    const qualified = proof.payload.qualified === true;

    if (referredSubject !== proof.subject) {
      throw new KernelError("SUBJECT", "attribution subject does not match referred subject");
    }
    if (!qualified) {
      throw new KernelError("NOT_QUALIFIED", "attributed result is not qualified yet");
    }

    return {
      claim: {
        channelId,
        event,
        referredSubject,
        qualified: true,
      },
      reference: `attribution:${channelId}:${event}:${referredSubject}`,
      hashMaterial: { channelId, event, referredSubject, qualified: true },
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
