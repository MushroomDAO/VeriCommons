import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Wallet } from "ethers";
import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_QUALIFIED_V1,
  assertTicketSignature,
  createKernel,
  GITHUB_REPO_STAR_V1,
  KernelError,
  recoverTicketIssuer,
  WEB_PUBLICATION_CHALLENGE_V1,
  type EvidenceRequest,
} from "../src/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadVector(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(root, "schemas", name), "utf8")) as Record<string, unknown>;
}

function mockFetch(routes: Record<string, { status: number; body?: string; json?: unknown }>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const hit = Object.entries(routes)
      .sort(([a], [b]) => b.length - a.length)
      .find(([prefix]) => url === prefix || url.startsWith(prefix));
    if (!hit) {
      return new Response("not mocked", { status: 599 });
    }
    const [, spec] = hit;
    if (spec.json !== undefined) {
      return new Response(JSON.stringify(spec.json), {
        status: spec.status,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(spec.status === 204 ? null : (spec.body ?? ""), { status: spec.status });
  }) as typeof fetch;
}

describe("P1 kernel", () => {
  it("is importable without packages/task", async () => {
    const mod = await import("../src/index.js");
    expect(mod.createKernel).toBeTypeOf("function");
    expect(mod.prove).toBeUndefined();
  });

  it("github.repo.star.v1 prove → verify → issue (SELF)", async () => {
    const vector = loadVector("github.repo.star.v1.json");
    const req = vector.request as { subject: string; params: Record<string, unknown> };
    const observation = vector.observation as {
      httpStatus: number;
      userStatus: number;
      owner: string;
      repo: string;
      login: string;
    };
    const signer = Wallet.createRandom();
    const kernel = createKernel({
      signer,
      fetchImpl: mockFetch({
        "https://api.github.com/user/starred/": { status: observation.httpStatus },
        "https://api.github.com/user": { status: observation.userStatus, json: { login: observation.login } },
      }),
    });
    const request: EvidenceRequest = {
      schema: GITHUB_REPO_STAR_V1,
      subject: req.subject,
      params: req.params,
    };
    const proof = await kernel.prove(request);
    expect(proof.payload.accessToken).toBeUndefined();
    expect(JSON.stringify(proof)).not.toContain("test-token");

    const verified = await kernel.verify(proof);
    expect(verified.brand).toBe("VerifiedEvidence");
    expect(verified.claim).toEqual(vector.claim);
    expect(verified.trust.assumption).toBe("SELF");
    expect(verified.proof.backend).toBe("github-api");
    expect(verified.proof.verifierSet).toBe("vericommons-kernel");

    const ticket = await kernel.issue(verified);
    expect(ticket.issuer).toBe(signer.address);
    expect(ticket.signature).toMatch(/^0x/);
    expect("brand" in ticket).toBe(false);
    assertTicketSignature(ticket, signer.address);
    expect(recoverTicketIssuer(ticket).toLowerCase()).toBe(signer.address.toLowerCase());
  });

  it("rejects a GitHub star miss", async () => {
    const signer = Wallet.createRandom();
    const kernel = createKernel({
      signer,
      fetchImpl: mockFetch({
        "https://api.github.com/user/starred/": { status: 404 },
        "https://api.github.com/user": { status: 200, json: { login: "alice" } },
      }),
    });
    const proof = await kernel.prove({
      schema: GITHUB_REPO_STAR_V1,
      subject: "0x1111111111111111111111111111111111111111",
      params: { owner: "tlsnotary", repo: "tlsn", accessToken: "x" },
    });
    await expect(kernel.verify(proof)).rejects.toMatchObject({ code: "NOT_STARRED" } satisfies Partial<KernelError>);
  });

  it("web.publication.challenge.v1 prove → verify → issue", async () => {
    const vector = loadVector("web.publication.challenge.v1.json");
    const req = vector.request as { subject: string; params: Record<string, unknown> };
    const signer = Wallet.createRandom();
    const kernel = createKernel({
      signer,
      fetchImpl: mockFetch({
        "https://alice.example/post": { status: 200, body: String(vector.page) },
      }),
    });
    const proof = await kernel.prove({
      schema: WEB_PUBLICATION_CHALLENGE_V1,
      subject: req.subject,
      params: req.params,
    });
    const verified = await kernel.verify(proof);
    expect(verified.claim).toEqual(vector.claim);
    expect(verified.trust.assumption).toBe("SELF");
    const ticket = await kernel.issue(verified);
    assertTicketSignature(ticket, signer.address);
  });

  it("fails public web when the backlink is missing", async () => {
    const signer = Wallet.createRandom();
    const kernel = createKernel({
      signer,
      fetchImpl: mockFetch({
        "https://alice.example/post": { status: 200, body: "vericommons:challenge:abc" },
      }),
    });
    const proof = await kernel.prove({
      schema: WEB_PUBLICATION_CHALLENGE_V1,
      subject: "0x2222222222222222222222222222222222222222",
      params: {
        url: "https://alice.example/post",
        challenge: "vericommons:challenge:abc",
        requiredBacklink: "https://plaza.example/tasks/42",
      },
    });
    await expect(kernel.verify(proof)).rejects.toMatchObject({ code: "WEB_BACKLINK" });
  });

  it("attribution.qualified.v1 issues RESULT_ATTRIBUTION, not zkTLS", async () => {
    const vector = loadVector("attribution.qualified.v1.json");
    const req = vector.request as { subject: string; params: Record<string, unknown> };
    const signer = Wallet.createRandom();
    const kernel = createKernel({ signer });
    const proof = await kernel.prove({
      schema: ATTRIBUTION_QUALIFIED_V1,
      subject: req.subject,
      params: req.params,
    });
    const verified = await kernel.verify(proof);
    expect(verified.proof.type).toBe("RESULT_ATTRIBUTION");
    expect(verified.source.type).toBe("issuer");
    expect(verified.claim).toEqual(vector.claim);
    const ticket = await kernel.issue(verified);
    assertTicketSignature(ticket, signer.address);
  });

  it("does not issue attribution until qualified", async () => {
    const kernel = createKernel({ signer: Wallet.createRandom() });
    const proof = await kernel.prove({
      schema: ATTRIBUTION_QUALIFIED_V1,
      subject: "0x3333333333333333333333333333333333333333",
      params: { channelId: "channel:alice:wechat", event: "signup", qualified: false },
    });
    await expect(kernel.verify(proof)).rejects.toMatchObject({ code: "NOT_QUALIFIED" });
  });

  it("rejects unknown schemas and unsigned issue input", async () => {
    const kernel = createKernel({ signer: Wallet.createRandom() });
    await expect(
      kernel.prove({ schema: "zkpass.mystery.v1", subject: "0x1", params: {} }),
    ).rejects.toThrow(/unknown schema/);
    await expect(
      kernel.issue({ trust: { assumption: "SELF" } } as never),
    ).rejects.toMatchObject({ code: "NOT_VERIFIED" });
  });
});
