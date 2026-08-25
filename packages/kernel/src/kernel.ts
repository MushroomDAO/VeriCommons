import { keccak256, toUtf8Bytes, type Signer } from "ethers";
import { AttributionBackend } from "./backends/attribution.js";
import { GithubApiBackend, type FetchLike } from "./backends/github-api.js";
import { OnchainBackend } from "./backends/onchain.js";
import { PublicWebBackend } from "./backends/public-web.js";
import { stableStringify } from "./canonical.js";
import { KernelError } from "./errors.js";
import { newNonce, TicketIssuer } from "./issuer.js";
import { getSchema } from "./schemas.js";
import type {
  EvidenceRequest,
  EvidenceTicket,
  IssuerClock,
  ProofBackend,
  RawProof,
  RpcReader,
  VerifiedEvidence,
} from "./types.js";

export interface KernelOptions {
  signer: Signer;
  fetchImpl?: FetchLike;
  rpc?: RpcReader;
  clock?: IssuerClock;
  chainId?: number;
  verifyingContract?: string;
  verifierSet?: string;
}

export class Kernel {
  readonly issuer: TicketIssuer;
  private readonly backends: Map<string, ProofBackend>;
  private readonly clock: IssuerClock;

  constructor(opts: KernelOptions) {
    this.issuer = new TicketIssuer({
      signer: opts.signer,
      chainId: opts.chainId,
      verifyingContract: opts.verifyingContract,
      verifierSet: opts.verifierSet,
    });
    const fetchImpl = opts.fetchImpl ?? fetch;
    this.backends = new Map<string, ProofBackend>([
      ["github-api", new GithubApiBackend(fetchImpl)],
      ["public-web", new PublicWebBackend(fetchImpl)],
      ["attribution", new AttributionBackend()],
      ["onchain", new OnchainBackend(opts.rpc)],
    ]);
    this.clock = opts.clock ?? { now: () => Math.floor(Date.now() / 1000) };
  }

  /** Collect a RawProof. Does not issue a ticket. */
  async prove(request: EvidenceRequest): Promise<RawProof> {
    const schema = getSchema(request.schema);
    const backend = this.backends.get(schema.backend);
    if (!backend) {
      throw new KernelError("BACKEND", `no P1 backend for ${schema.backend}`);
    }
    const proof = await backend.prove(request);
    if (proof.backend !== schema.backend) {
      throw new KernelError("BACKEND", "backend id mismatch");
    }
    if (proof.schema !== request.schema || proof.subject !== request.subject) {
      throw new KernelError("PROOF", "proof does not match request");
    }
    return proof;
  }

  /** Check a RawProof. Returns a branded object that issue() will accept. */
  async verify(proof: RawProof): Promise<VerifiedEvidence> {
    const schema = getSchema(proof.schema);
    if (proof.backend !== schema.backend) {
      throw new KernelError("BACKEND", `schema ${schema.id} requires backend ${schema.backend}`);
    }
    const backend = this.backends.get(schema.backend);
    if (!backend) {
      throw new KernelError("BACKEND", `no P1 backend for ${schema.backend}`);
    }
    const checked = await backend.verify(proof);
    const issuedAt = this.clock.now();
    const nonce = newNonce();
    const hash = keccak256(toUtf8Bytes(stableStringify(checked.hashMaterial)));

    const verified: VerifiedEvidence = {
      brand: "VerifiedEvidence",
      version: "0.1",
      subject: proof.subject,
      source: schema.source,
      schema: schema.id,
      claim: checked.claim,
      issuedAt,
      validUntil: issuedAt + schema.ttlSeconds,
      nonce,
      proof: {
        type: schema.proofType,
        backend: schema.backend,
        verifierSet: this.issuer.verifierSet,
        hash,
        reference: checked.reference,
      },
      trust: {
        assumption: schema.trust,
      },
    };
    if (!verified.trust.assumption) {
      throw new KernelError("TRUST", "trust.assumption must not be empty");
    }
    return verified;
  }

  /** Issue our entry ticket. Plaza, credits, and 4337 consume this object only. */
  async issue(verified: VerifiedEvidence): Promise<EvidenceTicket> {
    return this.issuer.issue(verified);
  }
}

export function createKernel(opts: KernelOptions): Kernel {
  return new Kernel(opts);
}
