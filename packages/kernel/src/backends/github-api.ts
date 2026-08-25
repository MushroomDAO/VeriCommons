import { assertNoSecrets } from "../canonical.js";
import { KernelError } from "../errors.js";
import { GITHUB_REPO_STAR_V1 } from "../schemas.js";
import type { EvidenceClaim, EvidenceRequest, ProofBackend, RawProof } from "../types.js";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class GithubApiBackend implements ProofBackend {
  readonly id = "github-api" as const;

  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async prove(request: EvidenceRequest): Promise<RawProof> {
    const owner = requiredString(request.params, "owner");
    const repo = requiredString(request.params, "repo");
    const accessToken = requiredString(request.params, "accessToken");

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "vericommons-kernel",
    };

    const starRes = await this.fetchImpl(
      `https://api.github.com/user/starred/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { headers },
    );
    const userRes = await this.fetchImpl("https://api.github.com/user", { headers });
    const userBody = (await userRes.json()) as { login?: string };

    const payload = {
      httpStatus: starRes.status,
      userStatus: userRes.status,
      owner,
      repo,
      login: userBody.login ?? "",
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
    if (proof.schema !== GITHUB_REPO_STAR_V1) {
      throw new KernelError("SCHEMA", "github-api backend only verifies github.repo.star.v1");
    }
    const httpStatus = numberField(proof.payload, "httpStatus");
    const userStatus = numberField(proof.payload, "userStatus");
    const owner = stringField(proof.payload, "owner");
    const repo = stringField(proof.payload, "repo");
    const login = stringField(proof.payload, "login");

    if (userStatus !== 200 || !login) {
      throw new KernelError("GITHUB_USER", "GitHub user lookup failed");
    }
    if (httpStatus === 404) {
      throw new KernelError("NOT_STARRED", `GitHub user ${login} has not starred ${owner}/${repo}`);
    }
    if (httpStatus !== 204) {
      throw new KernelError("GITHUB_STAR", `unexpected GitHub star status ${httpStatus}`);
    }

    return {
      claim: {
        owner,
        repo,
        starred: true,
        login,
      },
      reference: `github:${owner}/${repo}#starred-by:${login}`,
      hashMaterial: { httpStatus, userStatus, owner, repo, login },
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
