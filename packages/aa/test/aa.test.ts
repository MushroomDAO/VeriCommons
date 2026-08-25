import { hashMessage, keccak256, toUtf8Bytes, Wallet } from "ethers";
import { describe, expect, it } from "vitest";
import {
  createKernel,
  encodeOwnerOfResult,
  GITHUB_REPO_STAR_V1,
  ONCHAIN_NFT_HELD_V1,
} from "@vericommons/kernel";
import { isBound, isUserOpAllowed, subjectMatchesAccount, toTicketView } from "../src/index.js";

const holder = "0x1111111111111111111111111111111111111111";
const nft = "0x2222222222222222222222222222222222222222";

function githubFetch(): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("https://api.github.com/user/starred/")) {
      return new Response(null, { status: 204 });
    }
    if (url === "https://api.github.com/user" || url.startsWith("https://api.github.com/user")) {
      return new Response(JSON.stringify({ login: "alice" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("no", { status: 599 });
  }) as typeof fetch;
}

describe("P3 4337 adapter", () => {
  it("allows a UserOp only when our kernel ticket is valid", async () => {
    const signer = Wallet.createRandom();
    const kernel = createKernel({ signer, fetchImpl: githubFetch() });
    const proof = await kernel.prove({
      schema: GITHUB_REPO_STAR_V1,
      subject: holder,
      params: { owner: "tlsnotary", repo: "tlsn", accessToken: "x" },
    });
    const ticket = await kernel.issue(await kernel.verify(proof));
    const now = ticket.issuedAt;
    expect(
      isUserOpAllowed({
        sender: holder,
        ticket,
        expectedIssuer: signer.address,
        now,
      }),
    ).toBe(true);
    expect(
      isUserOpAllowed({
        sender: "0x3333333333333333333333333333333333333333",
        ticket,
        expectedIssuer: signer.address,
        now,
      }),
    ).toBe(false);
    expect(toTicketView(ticket).trustAssumption).toBe("SELF");
    expect(JSON.stringify(toTicketView(ticket))).not.toMatch(/zkpass|tlsn-blob/i);
  });

  it("onchain NFT ticket is the same EvidenceTicket type plaza/credits use", async () => {
    const signer = Wallet.createRandom();
    const kernel = createKernel({
      signer,
      rpc: { ethCall: async () => encodeOwnerOfResult(holder) },
    });
    const ticket = await kernel.issue(
      await kernel.verify(
        await kernel.prove({
          schema: ONCHAIN_NFT_HELD_V1,
          subject: holder,
          params: { chainId: 1, contract: nft, tokenId: "7" },
        }),
      ),
    );
    expect(ticket.schema).toBe(ONCHAIN_NFT_HELD_V1);
    expect(ticket.trust.assumption).toBe("SELF");
    expect(
      isUserOpAllowed({
        sender: holder,
        ticket,
        expectedIssuer: signer.address,
        now: ticket.issuedAt,
      }),
    ).toBe(true);
  });

  it("binds an EOA subject with a challenge (EIP-1271 path for contracts)", async () => {
    const wallet = Wallet.createRandom();
    const challenge = keccak256(toUtf8Bytes("vericommons-bind"));
    const signature = wallet.signingKey.sign(challenge).serialized;
    expect(
      await isBound({
        account: wallet.address,
        challenge,
        signature,
        getCode: async () => "0x",
      }),
    ).toBe(true);
    expect(subjectMatchesAccount(wallet.address, wallet.address)).toBe(true);
    expect(await isBound({
      account: wallet.address,
      challenge,
      signature: wallet.signingKey.sign(hashMessage("nope")).serialized,
      getCode: async () => "0x",
    })).toBe(false);
  });
});
