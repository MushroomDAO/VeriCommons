import { type Server } from "node:http";
import { request as httpRequest } from "node:http";
import { Wallet } from "ethers";
import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_QUALIFIED_V1,
  createKernel,
  createLocalVerifier,
  hashRawProof,
  type RawProof,
  type VerifiedEvidence,
  type Verifier,
} from "@vericommons/kernel";
import { createVerifierServer, HttpVerifier, VERIFIER_TOKEN_HEADER } from "../src/index.js";

const TOKEN = "test-verifier-token";

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("no listen address");
  }
  return `http://127.0.0.1:${addr.port}`;
}

describe("independent verifier service", () => {
  it("GET /health and POST /verify over HTTP", async () => {
    const server = createVerifierServer({
      verifier: createLocalVerifier({ verifierSet: "remote-worker" }),
      token: TOKEN,
    });
    const base = await listen(server);
    try {
      const health = await fetch(`${base}/health`);
      expect(health.status).toBe(200);
      expect(await health.json()).toEqual({ ok: true });

      const prover = createKernel({ signer: Wallet.createRandom() });
      const proof = await prover.prove({
        schema: ATTRIBUTION_QUALIFIED_V1,
        subject: "0x3333333333333333333333333333333333333333",
        params: { channelId: "channel:alice:wechat", event: "signup", qualified: true },
      });
      const remote = new HttpVerifier({ url: base, token: TOKEN });
      const verified = await remote.verify(proof);
      expect(verified.brand).toBe("VerifiedEvidence");
      expect(verified.proof.verifierSet).toBe("remote-worker");
    } finally {
      server.close();
    }
  });

  it("lets Kernel prove locally, verify remotely, issue locally", async () => {
    const server = createVerifierServer({
      verifier: createLocalVerifier({ verifierSet: "remote-worker" }),
      token: TOKEN,
    });
    const base = await listen(server);
    try {
      const signer = Wallet.createRandom();
      const kernel = createKernel({
        signer,
        verifier: new HttpVerifier({ url: base, token: TOKEN }),
      });
      const proof = await kernel.prove({
        schema: ATTRIBUTION_QUALIFIED_V1,
        subject: "0x3333333333333333333333333333333333333333",
        params: { channelId: "channel:alice:wechat", event: "signup", qualified: true },
      });
      const ticket = await kernel.issue(await kernel.verify(proof));
      expect(ticket.proof.verifierSet).toBe("remote-worker");
      expect(ticket.issuer).toBe(signer.address);
      expect("rawProofHash" in ticket.proof).toBe(false);
    } finally {
      server.close();
    }
  });

  it("maps KernelError from the remote process", async () => {
    const server = createVerifierServer({
      verifier: createLocalVerifier(),
      token: TOKEN,
    });
    const base = await listen(server);
    try {
      const prover = createKernel({ signer: Wallet.createRandom() });
      const proof = await prover.prove({
        schema: ATTRIBUTION_QUALIFIED_V1,
        subject: "0x3333333333333333333333333333333333333333",
        params: { channelId: "channel:alice:wechat", event: "signup", qualified: false },
      });
      const remote = new HttpVerifier({ url: base, token: TOKEN });
      await expect(remote.verify(proof)).rejects.toMatchObject({ code: "NOT_QUALIFIED" });
    } finally {
      server.close();
    }
  });

  it("rejects a non-proof body", async () => {
    const server = createVerifierServer({ verifier: createLocalVerifier(), token: TOKEN });
    const base = await listen(server);
    try {
      const res = await fetch(`${base}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json", [VERIFIER_TOKEN_HEADER]: TOKEN },
        body: JSON.stringify({ hello: "no" }),
      });
      expect(res.status).toBe(400);
    } finally {
      server.close();
    }
  });

  it("rejects POST /verify without the shared token", async () => {
    const server = createVerifierServer({ verifier: createLocalVerifier(), token: TOKEN });
    const base = await listen(server);
    try {
      const res = await fetch(`${base}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          schema: ATTRIBUTION_QUALIFIED_V1,
          subject: "0x1",
          backend: "attribution",
          observedAt: 1,
          payload: {},
        }),
      });
      expect(res.status).toBe(401);
    } finally {
      server.close();
    }
  });

  it("rejects a remote verify that swaps subject", async () => {
    const hostile: Verifier = {
      async verify(proof): Promise<VerifiedEvidence> {
        const honest = await createLocalVerifier().verify(proof);
        return { ...honest, subject: "0xATTACKER" };
      },
    };
    const server = createVerifierServer({ verifier: hostile, token: TOKEN });
    const base = await listen(server);
    try {
      const prover = createKernel({ signer: Wallet.createRandom() });
      const proof = await prover.prove({
        schema: ATTRIBUTION_QUALIFIED_V1,
        subject: "0x3333333333333333333333333333333333333333",
        params: { channelId: "channel:alice:wechat", event: "signup", qualified: true },
      });
      const remote = new HttpVerifier({ url: base, token: TOKEN });
      await expect(remote.verify(proof)).rejects.toMatchObject({ code: "VERIFY_BIND" });
    } finally {
      server.close();
    }
  });

  it("rejects a remote verify that omits verifierSet", async () => {
    const hostile: Verifier = {
      async verify(proof): Promise<VerifiedEvidence> {
        const honest = await createLocalVerifier().verify(proof);
        return { ...honest, proof: { ...honest.proof, verifierSet: "" } };
      },
    };
    const server = createVerifierServer({ verifier: hostile, token: TOKEN });
    const base = await listen(server);
    try {
      const prover = createKernel({ signer: Wallet.createRandom() });
      const proof = await prover.prove({
        schema: ATTRIBUTION_QUALIFIED_V1,
        subject: "0x3333333333333333333333333333333333333333",
        params: { channelId: "channel:alice:wechat", event: "signup", qualified: true },
      });
      const remote = new HttpVerifier({ url: base, token: TOKEN });
      await expect(remote.verify(proof)).rejects.toMatchObject({ code: "VERIFY_HTTP" });
    } finally {
      server.close();
    }
  });

  it("rejects a remote verify for a different RawProof payload", async () => {
    const prover = createKernel({ signer: Wallet.createRandom() });
    const proofA = await prover.prove({
      schema: ATTRIBUTION_QUALIFIED_V1,
      subject: "0x3333333333333333333333333333333333333333",
      params: { channelId: "channel:alice:wechat", event: "signup", qualified: true },
    });
    const verifiedA = await createLocalVerifier().verify(proofA);
    const remote = new HttpVerifier({
      url: "http://verifier.test",
      token: TOKEN,
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({
            ...verifiedA,
            proof: { ...verifiedA.proof, rawProofHash: hashRawProof(proofA) },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        )) as typeof fetch,
    });
    const proofB = { ...proofA, observedAt: proofA.observedAt + 1 };
    await expect(remote.verify(proofB)).rejects.toMatchObject({ code: "VERIFY_BIND" });
  });

  it("rejects a remote verify that omits source", async () => {
    const hostile: Verifier = {
      async verify(proof): Promise<VerifiedEvidence> {
        const honest = await createLocalVerifier().verify(proof);
        const { source: _source, ...rest } = honest;
        return rest as VerifiedEvidence;
      },
    };
    const server = createVerifierServer({ verifier: hostile, token: TOKEN });
    const base = await listen(server);
    try {
      const prover = createKernel({ signer: Wallet.createRandom() });
      const proof = await prover.prove({
        schema: ATTRIBUTION_QUALIFIED_V1,
        subject: "0x3333333333333333333333333333333333333333",
        params: { channelId: "channel:alice:wechat", event: "signup", qualified: true },
      });
      const remote = new HttpVerifier({ url: base, token: TOKEN });
      await expect(remote.verify(proof)).rejects.toMatchObject({ code: "VERIFY_HTTP" });
    } finally {
      server.close();
    }
  });

  it("rejects a remote verify that relabels trust.assumption", async () => {
    const hostile: Verifier = {
      async verify(proof): Promise<VerifiedEvidence> {
        const honest = await createLocalVerifier().verify(proof);
        return { ...honest, trust: { assumption: "VENDOR_ZKPASS" } };
      },
    };
    const server = createVerifierServer({ verifier: hostile, token: TOKEN });
    const base = await listen(server);
    try {
      const prover = createKernel({ signer: Wallet.createRandom() });
      const proof = await prover.prove({
        schema: ATTRIBUTION_QUALIFIED_V1,
        subject: "0x3333333333333333333333333333333333333333",
        params: { channelId: "channel:alice:wechat", event: "signup", qualified: true },
      });
      const remote = new HttpVerifier({ url: base, token: TOKEN });
      await expect(remote.verify(proof)).rejects.toMatchObject({ code: "VERIFY_BIND" });
    } finally {
      server.close();
    }
  });

  it("rejects a remote verify with a far-future validity window", async () => {
    const hostile: Verifier = {
      async verify(proof): Promise<VerifiedEvidence> {
        const honest = await createLocalVerifier().verify(proof);
        return { ...honest, issuedAt: 0, validUntil: 9999999999 };
      },
    };
    const server = createVerifierServer({ verifier: hostile, token: TOKEN });
    const base = await listen(server);
    try {
      const prover = createKernel({ signer: Wallet.createRandom() });
      const proof = await prover.prove({
        schema: ATTRIBUTION_QUALIFIED_V1,
        subject: "0x3333333333333333333333333333333333333333",
        params: { channelId: "channel:alice:wechat", event: "signup", qualified: true },
      });
      const remote = new HttpVerifier({ url: base, token: TOKEN });
      await expect(remote.verify(proof)).rejects.toMatchObject({ code: "VERIFY_HTTP" });
    } finally {
      server.close();
    }
  });

  it("rejects a remote verify that swaps schema proof type or source", async () => {
    const hostile: Verifier = {
      async verify(proof): Promise<VerifiedEvidence> {
        const honest = await createLocalVerifier().verify(proof);
        return {
          ...honest,
          source: { origin: "api.github.com", type: "https" },
          proof: { ...honest.proof, type: "SIGNED_API" },
        };
      },
    };
    const server = createVerifierServer({ verifier: hostile, token: TOKEN });
    const base = await listen(server);
    try {
      const prover = createKernel({ signer: Wallet.createRandom() });
      const proof = await prover.prove({
        schema: ATTRIBUTION_QUALIFIED_V1,
        subject: "0x3333333333333333333333333333333333333333",
        params: { channelId: "channel:alice:wechat", event: "signup", qualified: true },
      });
      const remote = new HttpVerifier({ url: base, token: TOKEN });
      await expect(remote.verify(proof)).rejects.toMatchObject({ code: "VERIFY_BIND" });
    } finally {
      server.close();
    }
  });

  it("maps a non-object JSON error body to KernelError", async () => {
    const remote = new HttpVerifier({
      url: "http://verifier.test",
      token: TOKEN,
      fetchImpl: (async () => new Response("null", { status: 502 })) as typeof fetch,
    });
    await expect(
      remote.verify({
        schema: ATTRIBUTION_QUALIFIED_V1,
        subject: "0x1",
        backend: "attribution",
        observedAt: 1,
        payload: {},
      }),
    ).rejects.toMatchObject({ code: "VERIFY_HTTP", message: "verifier HTTP 502" });
  });

  it("does not crash on a malformed request target", async () => {
    const server = createVerifierServer({ verifier: createLocalVerifier(), token: TOKEN });
    const base = await listen(server);
    const port = Number(new URL(base).port);
    try {
      const status = await new Promise<number>((resolve, reject) => {
        const req = httpRequest(
          { hostname: "127.0.0.1", port, path: "http://%", method: "GET" },
          (res) => {
            res.resume();
            resolve(res.statusCode ?? 0);
          },
        );
        req.on("error", reject);
        req.end();
      });
      expect(status).toBe(400);
      const health = await fetch(`${base}/health`);
      expect(health.status).toBe(200);
    } finally {
      server.close();
    }
  });
});

describe("RawProof wire shape", () => {
  it("keeps schema/subject/backend/payload for the HTTP contract", () => {
    const proof: RawProof = {
      schema: ATTRIBUTION_QUALIFIED_V1,
      subject: "0x1",
      backend: "attribution",
      observedAt: 1,
      payload: { qualified: true },
    };
    expect(JSON.parse(JSON.stringify(proof)).schema).toBe(ATTRIBUTION_QUALIFIED_V1);
  });
});
