import { hexlify, randomBytes, verifyTypedData } from "ethers";
import { hashClaim } from "./canonical.js";
import { EVIDENCE_TICKET_TYPES, EIP712_NAME, EIP712_VERSION, eip712Domain } from "./eip712.js";
import { KernelError } from "./errors.js";
import type { EvidenceTicket, Issuer, TicketSigner, VerifiedEvidence } from "./types.js";

export interface IssuerOptions {
  signer: TicketSigner;
  chainId?: number;
  verifyingContract?: string;
  verifierSet?: string;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export class TicketIssuer implements Issuer {
  readonly chainId: number;
  readonly verifyingContract: string;
  readonly verifierSet: string;
  private readonly signer: TicketSigner;

  constructor(opts: IssuerOptions) {
    this.signer = opts.signer;
    this.chainId = opts.chainId ?? 1;
    this.verifyingContract = opts.verifyingContract ?? ZERO_ADDRESS;
    this.verifierSet = opts.verifierSet ?? "vericommons-kernel";
  }

  domain() {
    return eip712Domain(this.chainId, this.verifyingContract);
  }

  async issue(verified: VerifiedEvidence): Promise<EvidenceTicket> {
    if (verified.brand !== "VerifiedEvidence") {
      throw new KernelError("NOT_VERIFIED", "issue() only accepts VerifiedEvidence from verify()");
    }
    const { rawProofHash: _rawProofHash, ...proof } = verified.proof;
    const resolved = {
      ...verified,
      proof: {
        ...proof,
        verifierSet: verified.proof.verifierSet || this.verifierSet,
      },
    };
    const issuer = await this.signer.getAddress();
    const value = ticketTypedValue(resolved);
    const signature = await this.signer.signTypedData(
      {
        name: EIP712_NAME,
        version: EIP712_VERSION,
        chainId: this.chainId,
        verifyingContract: this.verifyingContract,
      },
      EVIDENCE_TICKET_TYPES,
      value,
    );
    const { brand: _brand, ...body } = resolved;
    return {
      ...body,
      issuer,
      signature,
    };
  }
}

export function ticketTypedValue(ticket: {
  version: string;
  subject: string;
  schema: string;
  claim: Record<string, unknown>;
  issuedAt: number;
  validUntil: number;
  nonce: string;
  proof: { backend: string; verifierSet: string };
  trust: { assumption: string };
}) {
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

export function recoverTicketIssuer(
  ticket: EvidenceTicket,
  chainId = 1,
  verifyingContract = ZERO_ADDRESS,
): string {
  return verifyTypedData(
    eip712Domain(chainId, verifyingContract),
    EVIDENCE_TICKET_TYPES,
    ticketTypedValue(ticket),
    ticket.signature,
  );
}

export function assertTicketSignature(
  ticket: EvidenceTicket,
  expectedIssuer?: string,
  chainId = 1,
  verifyingContract = ZERO_ADDRESS,
): void {
  const recovered = recoverTicketIssuer(ticket, chainId, verifyingContract);
  if (recovered.toLowerCase() !== ticket.issuer.toLowerCase()) {
    throw new KernelError("BAD_SIGNATURE", "ticket issuer does not match EIP-712 signature");
  }
  if (expectedIssuer && recovered.toLowerCase() !== expectedIssuer.toLowerCase()) {
    throw new KernelError("UNKNOWN_ISSUER", "ticket was not issued by the expected kernel issuer");
  }
}

export function newNonce(): string {
  return hexlify(randomBytes(32));
}
