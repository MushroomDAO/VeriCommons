import { type Server } from "node:http";
import { Wallet } from "ethers";
import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_QUALIFIED_V1,
  createKernel,
  createLocalVerifier,
  type RawProof,
} from "@vericommons/kernel";
import { createVerifierServer, HttpVerifier } from "../src/index.js";

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
      const remote = new HttpVerifier({ url: base });
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
    });
    const base = await listen(server);
    try {
      const signer = Wallet.createRandom();
      const kernel = createKernel({
        signer,
        verifier: new HttpVerifier({ url: base }),
      });
      const proof = await kernel.prove({
        schema: ATTRIBUTION_QUALIFIED_V1,
        subject: "0x3333333333333333333333333333333333333333",
        params: { channelId: "channel:alice:wechat", event: "signup", qualified: true },
      });
      const ticket = await kernel.issue(await kernel.verify(proof));
      expect(ticket.proof.verifierSet).toBe("remote-worker");
      expect(ticket.issuer).toBe(signer.address);
    } finally {
      server.close();
    }
  });

  it("maps KernelError from the remote process", async () => {
    const server = createVerifierServer({
      verifier: createLocalVerifier(),
    });
    const base = await listen(server);
    try {
      const prover = createKernel({ signer: Wallet.createRandom() });
      const proof = await prover.prove({
        schema: ATTRIBUTION_QUALIFIED_V1,
        subject: "0x3333333333333333333333333333333333333333",
        params: { channelId: "channel:alice:wechat", event: "signup", qualified: false },
      });
      const remote = new HttpVerifier({ url: base });
      await expect(remote.verify(proof)).rejects.toMatchObject({ code: "NOT_QUALIFIED" });
    } finally {
      server.close();
    }
  });

  it("rejects a non-proof body", async () => {
    const server = createVerifierServer({ verifier: createLocalVerifier() });
    const base = await listen(server);
    try {
      const res = await fetch(`${base}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hello: "no" }),
      });
      expect(res.status).toBe(400);
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
