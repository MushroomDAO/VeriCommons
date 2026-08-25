import { getAddress } from "ethers";
import {
  assertTicketSignature,
  hashClaim,
  type EvidenceTicket,
} from "@vericommons/kernel";

export interface UserOpGateInput {
  sender: string;
  ticket: EvidenceTicket;
  expectedIssuer: string;
  now: number;
  chainId?: number;
  verifyingContract?: string;
}

/**
 * Off-chain bundler / paymaster check. Mirrors EvidenceTicketValidator.
 * Plaza and credits already consume the same EvidenceTicket type.
 */
export function isUserOpAllowed(input: UserOpGateInput): boolean {
  const { ticket } = input;
  if (!ticket.trust?.assumption) return false;
  if (input.now > ticket.validUntil) return false;
  try {
    if (getAddress(ticket.subject) !== getAddress(input.sender)) return false;
    assertTicketSignature(
      ticket,
      input.expectedIssuer,
      input.chainId ?? 1,
      input.verifyingContract ?? "0x0000000000000000000000000000000000000000",
    );
    return true;
  } catch {
    return false;
  }
}

export function toTicketView(ticket: EvidenceTicket) {
  return {
    version: ticket.version,
    subject: ticket.subject,
    schema: ticket.schema,
    claimHash: hashClaim(ticket.claim),
    issuedAt: ticket.issuedAt,
    validUntil: ticket.validUntil,
    nonce: ticket.nonce,
    backend: ticket.proof.backend,
    verifierSet: ticket.proof.verifierSet,
    trustAssumption: ticket.trust.assumption,
  };
}
