import type { TicketSigner } from "@vericommons/kernel";
import { KmsError } from "./errors.js";
import { toKmsTypedData, type KmsSignTypedDataBody } from "./typed-data.js";

const DEFAULT_OWNER_PATH = "m/44'/60'/0'/0/0";
const DEFAULT_KMS_URL = "https://kms.aastar.io";

export interface AirAccountKmsSignerOptions {
  /** Origin only, e.g. https://kms.aastar.io */
  url: string;
  apiKey: string;
  keyId: string;
  /** Address of the key at hdPath. DeriveAddress needs WebAuthn; pass it from config. */
  issuerAddress: string;
  /**
   * Owner root: m/44'/60'/0'/0/0.
   * Agent JWT must use m/44'/60'/0'/1/{agentIndex} (KMS rejects anything else on JWT path).
   */
  hdPath?: string;
  /** Automated issuer: create-agent-key once, then Bearer JWT. */
  agentJwt?: string;
  fetchImpl?: typeof fetch;
}

export class AirAccountKmsSigner implements TicketSigner {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly keyId: string;
  private readonly issuerAddress: string;
  private readonly hdPath: string;
  private readonly agentJwt?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: AirAccountKmsSignerOptions) {
    if (!opts.url || !opts.apiKey || !opts.keyId || !opts.issuerAddress) {
      throw new KmsError("CONFIG", "url, apiKey, keyId, and issuerAddress are required");
    }
    if (opts.agentJwt && !opts.hdPath) {
      throw new KmsError(
        "CONFIG",
        "hdPath is required with agent JWT (m/44'/60'/0'/1/{agentIndex})",
      );
    }
    this.url = opts.url.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.keyId = opts.keyId;
    this.issuerAddress = opts.issuerAddress;
    this.hdPath = opts.hdPath ?? DEFAULT_OWNER_PATH;
    this.agentJwt = opts.agentJwt;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async getAddress(): Promise<string> {
    return this.issuerAddress;
  }

  async signTypedData(
    domain: {
      name?: string;
      version?: string;
      chainId?: number | bigint;
      verifyingContract?: string;
    },
    types: Record<string, Array<{ name: string; type: string }>>,
    value: Record<string, unknown>,
  ): Promise<string> {
    const typed = toKmsTypedData(domain, types, value);
    const body: KmsSignTypedDataBody = {
      keyId: this.keyId,
      hdPath: this.hdPath,
      ...typed,
    };
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-api-key": this.apiKey,
    };
    if (this.agentJwt) {
      headers.Authorization = `Bearer ${this.agentJwt}`;
    }

    const res = await this.fetchImpl(`${this.url}/kms/SignTypedData`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new KmsError("SIGN", `KMS SignTypedData failed (${res.status}): ${kmsErrorText(text)}`);
    }
    let parsed: { signature?: string };
    try {
      parsed = JSON.parse(text) as { signature?: string };
    } catch {
      throw new KmsError("SIGN", "KMS returned non-JSON signature response");
    }
    if (typeof parsed.signature !== "string" || parsed.signature.length === 0) {
      throw new KmsError("SIGN", "KMS response missing signature");
    }
    return parsed.signature.startsWith("0x") ? parsed.signature : `0x${parsed.signature}`;
  }
}

export function airAccountSignerFromEnv(
  env: NodeJS.Dict<string> = process.env,
  fetchImpl?: typeof fetch,
): AirAccountKmsSigner {
  const url = env.KMS_URL ?? DEFAULT_KMS_URL;
  const apiKey = required(env, "KMS_API_KEY");
  const keyId = required(env, "KMS_KEY_ID");
  const issuerAddress = required(env, "KMS_ISSUER_ADDRESS");
  return new AirAccountKmsSigner({
    url,
    apiKey,
    keyId,
    issuerAddress,
    hdPath: env.KMS_HD_PATH,
    agentJwt: env.KMS_AGENT_JWT,
    fetchImpl,
  });
}

function required(env: NodeJS.Dict<string>, key: string): string {
  const value = env[key];
  if (!value) {
    throw new KmsError("CONFIG", `missing ${key}`);
  }
  return value;
}

function kmsErrorText(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    if (typeof parsed.error === "string") {
      return parsed.error;
    }
  } catch {
    // fall through
  }
  return body.slice(0, 300);
}
