import { getAddress, Wallet } from "ethers";
import { describe, expect, it } from "vitest";
import {
  createKernel,
  encodeOwnerOfResult,
  ONCHAIN_NFT_HELD_V1,
} from "../src/index.js";

const holder = "0x1111111111111111111111111111111111111111";
const nft = "0x2222222222222222222222222222222222222222";

describe("P3 onchain prover", () => {
  it("issues a SELF ticket when the subject holds the NFT", async () => {
    const signer = Wallet.createRandom();
    const kernel = createKernel({
      signer,
      rpc: {
        ethCall: async () => encodeOwnerOfResult(holder),
      },
    });
    const proof = await kernel.prove({
      schema: ONCHAIN_NFT_HELD_V1,
      subject: holder,
      params: { chainId: 1, contract: nft, tokenId: "7" },
    });
    const verified = await kernel.verify(proof);
    expect(verified.trust.assumption).toBe("SELF");
    expect(verified.source.type).toBe("onchain");
    expect(verified.proof.backend).toBe("onchain");
    expect(verified.claim).toEqual({
      chainId: 1,
      contract: getAddress(nft),
      tokenId: "7",
      owner: getAddress(holder),
      held: true,
    });
    const ticket = await kernel.issue(verified);
    expect(ticket.schema).toBe(ONCHAIN_NFT_HELD_V1);
    expect(ticket.proof.type).toBe("ONCHAIN_STATE");
  });

  it("fails when the NFT is held by someone else", async () => {
    const kernel = createKernel({
      signer: Wallet.createRandom(),
      rpc: {
        ethCall: async () => encodeOwnerOfResult("0x3333333333333333333333333333333333333333"),
      },
    });
    const proof = await kernel.prove({
      schema: ONCHAIN_NFT_HELD_V1,
      subject: holder,
      params: { chainId: 1, contract: nft, tokenId: 7 },
    });
    await expect(kernel.verify(proof)).rejects.toMatchObject({ code: "NOT_HOLDER" });
  });
});
