import type { TicketSigner } from "@vericommons/kernel";
import { verifyTypedData } from "ethers";
import { KmsError } from "./errors.js";
import { toKmsTypedData, type KmsSignTypedDataBody } from "./typed-data.js";

const DEFAULT_KMS_URL = "https://kms.aastar.io";

export interface AirAccountKmsSignerOptions {
  /** Origin only, e.g. https://kms.aastar.io */
  url: string;
  apiKey: string;
  keyId: string;
  /** Address of the key at hdPath. DeriveAddress needs WebAuthn; pass it from config. */
  issuerAddress: string;
  /** Agent path: m/44'/60'/0'/1/{agentIndex}. KMS rejects other paths on the JWT. */
  hdPath: string;
  /** Automated issuer: create-agent-key once, then Bearer JWT. Required; this signer has no WebAuthn. */
  agentJwt: string;
  fetchImpl?: typeof fetch;
}

export class AirAccountKmsSigner implements TicketSigner {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly keyId: string;
  private readonly issuerAddress: string;
  private readonly hdPath: string;
  private readonly agentJwt: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: AirAccountKmsSignerOptions) {
    if (!opts.url || !opts.apiKey || !opts.keyId || !opts.issuerAddress) {
      throw new KmsError("CONFIG", "url, apiKey, keyId, and issuerAddress are required");
    }
    if (!opts.agentJwt) {
      throw new KmsError("CONFIG", "agent JWT is required; this signer has no WebAuthn path");
    }
    if (!opts.hdPath) {
      throw new KmsError(
        "CONFIG",
        "hdPath is required with agent JWT (m/44'/60'/0'/1/{agentIndex})",
      );
    }
    this.url = opts.url.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.keyId = opts.keyId;
    this.issuerAddress = opts.issuerAddress;
    this.hdPath = opts.hdPath;
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
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      throw new KmsError("SIGN", "KMS returned non-JSON signature response");
    }
    if (typeof parsed !== "object" || parsed === null) {
      throw new KmsError("SIGN", "KMS response missing signature");
    }
    const signatureField = (parsed as { signature?: unknown }).signature;
    if (typeof signatureField !== "string" || signatureField.length === 0) {
      throw new KmsError("SIGN", "KMS response missing signature");
    }
    const signature = signatureField.startsWith("0x") ? signatureField : `0x${signatureField}`;
    let recovered: string;
    try {
      recovered = verifyTypedData(domain, types, value, signature);
    } catch {
      throw new KmsError("SIGN", "KMS signature is not valid EIP-712");
    }
    if (recovered.toLowerCase() !== this.issuerAddress.toLowerCase()) {
      throw new KmsError("SIGN", "KMS signature does not match issuerAddress");
    }
    return signature;
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
    hdPath: required(env, "KMS_HD_PATH"),
    agentJwt: required(env, "KMS_AGENT_JWT"),
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
