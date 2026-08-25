import { Wallet } from "ethers";
import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_QUALIFIED_V1,
  assertTicketSignature,
  createKernel,
  EVIDENCE_TICKET_TYPES,
  recoverTicketIssuer,
} from "@vericommons/kernel";
import { AirAccountKmsSigner, airAccountSignerFromEnv, KmsError, toKmsTypedData } from "../src/index.js";

function fakeAirAccountKms(wallet: Wallet): typeof fetch {
  return (async (_input, init) => {
    const headers = init?.headers as Record<string, string>;
    if (headers["x-api-key"] !== "test-key") {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }
    const body = JSON.parse(String(init?.body)) as {
      domain: { name?: string; version?: string; chainId?: number; verifyingContract?: string };
      types: Array<{ name: string; fields: Array<{ name: string; type: string }> }>;
      message: Array<{ name: string; value: unknown }>;
      hdPath: string;
      keyId: string;
    };
    const types: Record<string, Array<{ name: string; type: string }>> = {};
    for (const def of body.types) {
      types[def.name] = def.fields;
    }
    const value: Record<string, unknown> = {};
    for (const field of body.message) {
      value[field.name] = field.value;
    }
    const signature = await wallet.signTypedData(body.domain, types, value);
    return new Response(JSON.stringify({ keyId: body.keyId, signature }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

describe("AirAccount KMS signer", () => {
  it("encodes EvidenceTicket fields in struct order for SignTypedData", () => {
    const encoded = toKmsTypedData(
      { name: "VeriCommons", version: "0.1", chainId: 1n, verifyingContract: "0x0000000000000000000000000000000000000000" },
      EVIDENCE_TICKET_TYPES,
      {
        version: "0.1",
        subject: "0x1",
        schema: "github.repo.star.v1",
        claimHash: "0x" + "ab".repeat(32),
        issuedAt: 1,
        validUntil: 2,
        nonce: "0x" + "cd".repeat(32),
        backend: "github-api",
        verifierSet: "vericommons-kernel",
        trustAssumption: "SELF",
      },
    );
    expect(encoded.primaryType).toBe("EvidenceTicket");
    expect(encoded.message.map((field) => field.name)).toEqual(
      EVIDENCE_TICKET_TYPES.EvidenceTicket?.map((field) => field.name),
    );
    expect(encoded.message.find((field) => field.name === "issuedAt")?.value).toBe("1");
    expect(encoded.domain.chainId).toBe(1);
  });

  it("signs an EvidenceTicket through POST /kms/SignTypedData without a local key", async () => {
    const wallet = Wallet.createRandom();
    const signer = new AirAccountKmsSigner({
      url: "https://kms.aastar.io",
      apiKey: "test-key",
      keyId: "wallet-uuid",
      issuerAddress: wallet.address,
      agentJwt: "agent.jwt",
      hdPath: "m/44'/60'/0'/1/0",
      fetchImpl: fakeAirAccountKms(wallet),
    });
    const kernel = createKernel({ signer });
    const proof = await kernel.prove({
      schema: ATTRIBUTION_QUALIFIED_V1,
      subject: "0x3333333333333333333333333333333333333333",
      params: { channelId: "channel:alice:wechat", event: "signup", qualified: true },
    });
    const ticket = await kernel.issue(await kernel.verify(proof));
    expect(ticket.issuer).toBe(wallet.address);
    assertTicketSignature(ticket, wallet.address);
    expect(recoverTicketIssuer(ticket).toLowerCase()).toBe(wallet.address.toLowerCase());
  });

  it("sends x-api-key and Bearer JWT, never a private key", async () => {
    const wallet = Wallet.createRandom();
    let captured: { url: string; headers: Record<string, string>; body: string } | undefined;
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = {
        url: String(input),
        headers: init?.headers as Record<string, string>,
        body: String(init?.body),
      };
      return fakeAirAccountKms(wallet)(input, init);
    }) as typeof fetch;
    const signer = new AirAccountKmsSigner({
      url: "https://kms.aastar.io/",
      apiKey: "test-key",
      keyId: "wallet-uuid",
      issuerAddress: wallet.address,
      agentJwt: "agent.jwt",
      hdPath: "m/44'/60'/0'/1/0",
      fetchImpl,
    });
    await signer.signTypedData(
      { name: "VeriCommons", version: "0.1", chainId: 1, verifyingContract: "0x0000000000000000000000000000000000000000" },
      { Mail: [{ name: "contents", type: "string" }] },
      { contents: "hello" },
    );
    expect(captured?.url).toBe("https://kms.aastar.io/kms/SignTypedData");
    expect(captured?.headers["x-api-key"]).toBe("test-key");
    expect(captured?.headers.Authorization).toBe("Bearer agent.jwt");
    expect(captured?.body).not.toMatch(/privateKey|PRIVATE_KEY|ISSUER_PRIVATE_KEY/);
    const body = JSON.parse(captured?.body ?? "{}") as { types: unknown; message: unknown; hdPath: string };
    expect(Array.isArray(body.types)).toBe(true);
    expect(Array.isArray(body.message)).toBe(true);
    expect(body.hdPath).toBe("m/44'/60'/0'/1/0");
  });

  it("requires hdPath when using an agent JWT", () => {
    expect(
      () =>
        new AirAccountKmsSigner({
          url: "https://kms.aastar.io",
          apiKey: "k",
          keyId: "id",
          issuerAddress: Wallet.createRandom().address,
          agentJwt: "jwt",
        }),
    ).toThrow(KmsError);
  });

  it("reads production env without a local key", () => {
    const signer = airAccountSignerFromEnv({
      KMS_URL: "https://kms.aastar.io",
      KMS_API_KEY: "k",
      KMS_KEY_ID: "id",
      KMS_ISSUER_ADDRESS: "0x1111111111111111111111111111111111111111",
      KMS_AGENT_JWT: "jwt",
      KMS_HD_PATH: "m/44'/60'/0'/1/0",
    });
    expect(signer).toBeInstanceOf(AirAccountKmsSigner);
  });

  it("rejects a KMS signature that does not match issuerAddress", async () => {
    const wallet = Wallet.createRandom();
    const signer = new AirAccountKmsSigner({
      url: "https://kms.aastar.io",
      apiKey: "test-key",
      keyId: "wallet-uuid",
      issuerAddress: Wallet.createRandom().address,
      agentJwt: "agent.jwt",
      hdPath: "m/44'/60'/0'/1/0",
      fetchImpl: fakeAirAccountKms(wallet),
    });
    await expect(
      signer.signTypedData(
        { name: "VeriCommons", version: "0.1", chainId: 1, verifyingContract: "0x0000000000000000000000000000000000000000" },
        { Mail: [{ name: "contents", type: "string" }] },
        { contents: "hello" },
      ),
    ).rejects.toMatchObject({ code: "SIGN" });
  });
});
