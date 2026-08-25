import type { SchemaDefinition } from "./types.js";
import { TrustAssumption } from "./trust.js";

export const GITHUB_REPO_STAR_V1 = "github.repo.star.v1";
export const WEB_PUBLICATION_CHALLENGE_V1 = "web.publication.challenge.v1";
export const ATTRIBUTION_QUALIFIED_V1 = "attribution.qualified.v1";

export const SCHEMAS: Record<string, SchemaDefinition> = {
  [GITHUB_REPO_STAR_V1]: {
    id: GITHUB_REPO_STAR_V1,
    source: { origin: "api.github.com", type: "https" },
    backend: "github-api",
    proofType: "SIGNED_API",
    trust: TrustAssumption.SELF,
    ttlSeconds: 7 * 24 * 60 * 60,
  },
  [WEB_PUBLICATION_CHALLENGE_V1]: {
    id: WEB_PUBLICATION_CHALLENGE_V1,
    source: { origin: "public-web", type: "https" },
    backend: "public-web",
    proofType: "PUBLIC_WEB_CHALLENGE",
    trust: TrustAssumption.SELF,
    ttlSeconds: 7 * 24 * 60 * 60,
  },
  [ATTRIBUTION_QUALIFIED_V1]: {
    id: ATTRIBUTION_QUALIFIED_V1,
    source: { origin: "vericommons.attribution", type: "issuer" },
    backend: "attribution",
    proofType: "RESULT_ATTRIBUTION",
    trust: TrustAssumption.SELF,
    ttlSeconds: 30 * 24 * 60 * 60,
  },
};

export function getSchema(id: string): SchemaDefinition {
  const schema = SCHEMAS[id];
  if (!schema) {
    throw new Error(`unknown schema: ${id}`);
  }
  return schema;
}
