import { id as typedId, type TypedDataDomain, type TypedDataField } from "ethers";
import { EVIDENCE_VERSION } from "./types.js";

export const EIP712_NAME = "VeriCommons";
export const EIP712_VERSION = EVIDENCE_VERSION;

export const EVIDENCE_TICKET_TYPES: Record<string, TypedDataField[]> = {
  EvidenceTicket: [
    { name: "version", type: "string" },
    { name: "subject", type: "string" },
    { name: "schema", type: "string" },
    { name: "claimHash", type: "bytes32" },
    { name: "issuedAt", type: "uint256" },
    { name: "validUntil", type: "uint256" },
    { name: "nonce", type: "bytes32" },
    { name: "backend", type: "string" },
    { name: "verifierSet", type: "string" },
    { name: "trustAssumption", type: "string" },
  ],
};

export function eip712Domain(chainId: number, verifyingContract: string): TypedDataDomain {
  return {
    name: EIP712_NAME,
    version: EIP712_VERSION,
    chainId,
    verifyingContract,
  };
}

export function typedDataPrimaryType(): string {
  return "EvidenceTicket";
}

/** Typehash kept for contract consumers later. */
export const EVIDENCE_TICKET_TYPEHASH = typedId(
  "EvidenceTicket(string version,string subject,string schema,bytes32 claimHash,uint256 issuedAt,uint256 validUntil,bytes32 nonce,string backend,string verifierSet,string trustAssumption)",
);
