import { keccak256, toUtf8Bytes } from "ethers";
import { AttributionBackend } from "./backends/attribution.js";
import { GithubApiBackend, type FetchLike } from "./backends/github-api.js";
import { OnchainBackend } from "./backends/onchain.js";
import { PublicWebBackend } from "./backends/public-web.js";
import { hashRawProof, stableStringify } from "./canonical.js";
import { KernelError } from "./errors.js";
import { newNonce } from "./issuer.js";
import { getSchema } from "./schemas.js";
import type {
  IssuerClock,
  ProofBackend,
  RawProof,
  RpcReader,
  VerifiedEvidence,
  Verifier,
} from "./types.js";

export interface LocalVerifierOptions {
  fetchImpl?: FetchLike;
  rpc?: RpcReader;
  clock?: IssuerClock;
  verifierSet?: string;
}

export class LocalVerifier implements Verifier {
  private readonly backends: Map<string, ProofBackend>;
  private readonly clock: IssuerClock;
  readonly verifierSet: string;

  constructor(opts: LocalVerifierOptions = {}) {
    const fetchImpl = opts.fetchImpl ?? fetch;
    this.backends = new Map<string, ProofBackend>([
      ["github-api", new GithubApiBackend(fetchImpl)],
      ["public-web", new PublicWebBackend(fetchImpl)],
      ["attribution", new AttributionBackend()],
      ["onchain", new OnchainBackend(opts.rpc)],
    ]);
    this.clock = opts.clock ?? { now: () => Math.floor(Date.now() / 1000) };
    this.verifierSet = opts.verifierSet ?? "vericommons-kernel";
  }

  async verify(proof: RawProof): Promise<VerifiedEvidence> {
    const schema = getSchema(proof.schema);
    if (proof.backend !== schema.backend) {
      throw new KernelError("BACKEND", `schema ${schema.id} requires backend ${schema.backend}`);
    }
    const backend = this.backends.get(schema.backend);
    if (!backend) {
      throw new KernelError("BACKEND", `no backend for ${schema.backend}`);
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
        verifierSet: this.verifierSet,
        hash,
        rawProofHash: hashRawProof(proof),
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
}

export function createLocalVerifier(opts: LocalVerifierOptions = {}): LocalVerifier {
  return new LocalVerifier(opts);
}
