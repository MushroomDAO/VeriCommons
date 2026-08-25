import { AbiCoder, getAddress, Interface } from "ethers";
import { assertNoSecrets } from "../canonical.js";
import { KernelError } from "../errors.js";
import { ONCHAIN_NFT_HELD_V1 } from "../schemas.js";
import type { EvidenceClaim, EvidenceRequest, ProofBackend, RawProof, RpcReader } from "../types.js";

const erc721 = new Interface(["function ownerOf(uint256 tokenId) view returns (address)"]);

/**
 * Arrow B: account / NFT / module state is a source of facts.
 * A relayer reads the chain; the contract does not run HTTPS or zkTLS.
 */
export class OnchainBackend implements ProofBackend {
  readonly id = "onchain" as const;

  constructor(private readonly rpc?: RpcReader) {}

  async prove(request: EvidenceRequest): Promise<RawProof> {
    if (!this.rpc) {
      throw new KernelError("RPC", "onchain prover needs an RpcReader");
    }
    const contract = getAddress(requiredString(request.params, "contract"));
    const tokenId = tokenIdFrom(request.params.tokenId);
    const chainId = numberField(request.params, "chainId");
    const data = erc721.encodeFunctionData("ownerOf", [tokenId]);
    const raw = await this.rpc.ethCall(contract, data);
    const owner = getAddress(String(erc721.decodeFunctionResult("ownerOf", raw)[0]));
    const payload = {
      chainId,
      contract,
      tokenId: tokenId.toString(),
      owner,
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
    if (proof.schema !== ONCHAIN_NFT_HELD_V1) {
      throw new KernelError("SCHEMA", "onchain backend only verifies onchain.nft.held.v1");
    }
    const chainId = numberField(proof.payload, "chainId");
    const contract = stringField(proof.payload, "contract");
    const tokenId = stringField(proof.payload, "tokenId");
    const owner = getAddress(stringField(proof.payload, "owner"));
    let subject: string;
    try {
      subject = getAddress(proof.subject);
    } catch {
      throw new KernelError("SUBJECT", "onchain subject must be an address");
    }
    if (owner !== subject) {
      throw new KernelError("NOT_HOLDER", `owner ${owner} is not subject ${subject}`);
    }
    return {
      claim: {
        chainId,
        contract,
        tokenId,
        owner,
        held: true,
      },
      reference: `onchain:${chainId}:${contract}#${tokenId}`,
      hashMaterial: { chainId, contract, tokenId, owner },
    };
  }
}

export function encodeOwnerOfResult(owner: string): string {
  return AbiCoder.defaultAbiCoder().encode(["address"], [getAddress(owner)]);
}

function tokenIdFrom(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string" && value.length > 0) return BigInt(value);
  throw new KernelError("PARAM", "missing tokenId");
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
