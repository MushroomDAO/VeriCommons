import { AttributionBackend } from "./backends/attribution.js";
import { GithubApiBackend, type FetchLike } from "./backends/github-api.js";
import { OnchainBackend } from "./backends/onchain.js";
import { PublicWebBackend } from "./backends/public-web.js";
import { KernelError } from "./errors.js";
import { TicketIssuer } from "./issuer.js";
import { createLocalVerifier } from "./local-verifier.js";
import { getSchema } from "./schemas.js";
import type {
  EvidenceRequest,
  EvidenceTicket,
  Issuer,
  IssuerClock,
  Prover,
  ProofBackend,
  RawProof,
  RpcReader,
  TicketSigner,
  VerifiedEvidence,
  Verifier,
} from "./types.js";

export interface KernelOptions {
  /** Local ethers Wallet in tests; AirAccount KMS signer in production (T1.1). */
  signer: TicketSigner;
  /** Override verify. Default is in-process LocalVerifier. Production injects HttpVerifier. */
  verifier?: Verifier;
  fetchImpl?: FetchLike;
  rpc?: RpcReader;
  clock?: IssuerClock;
  chainId?: number;
  verifyingContract?: string;
  verifierSet?: string;
}

export class Kernel implements Prover, Verifier, Issuer {
  readonly issuer: TicketIssuer;
  readonly verifier: Verifier;
  private readonly backends: Map<string, ProofBackend>;

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
    this.verifier =
      opts.verifier ??
      createLocalVerifier({
        fetchImpl,
        rpc: opts.rpc,
        clock: opts.clock,
        verifierSet: opts.verifierSet ?? this.issuer.verifierSet,
      });
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
    return this.verifier.verify(proof);
  }

  /** Issue our entry ticket. Plaza, credits, and 4337 consume this object only. */
  async issue(verified: VerifiedEvidence): Promise<EvidenceTicket> {
    return this.issuer.issue(verified);
  }
}

export function createKernel(opts: KernelOptions): Kernel {
  return new Kernel(opts);
}
