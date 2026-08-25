import { KmsError } from "./errors.js";

export interface KmsEip712Domain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: string;
}

export interface KmsTypeField {
  name: string;
  type: string;
}

export interface KmsTypeDef {
  name: string;
  fields: KmsTypeField[];
}

export interface KmsFieldValue {
  name: string;
  value: unknown;
}

export interface KmsSignTypedDataBody {
  keyId: string;
  hdPath: string;
  domain: KmsEip712Domain;
  primaryType: string;
  types: KmsTypeDef[];
  message: KmsFieldValue[];
}

const PRIMARY_SKIP = new Set(["EIP712Domain"]);

/**
 * Convert ethers-style typed data into AirAccount POST /kms/SignTypedData body fields.
 * Field order follows the struct definition, not object key insertion order.
 */
export function toKmsTypedData(
  domain: {
    name?: string;
    version?: string;
    chainId?: number | bigint;
    verifyingContract?: string;
  },
  types: Record<string, Array<{ name: string; type: string }>>,
  value: Record<string, unknown>,
  primaryType?: string,
): Pick<KmsSignTypedDataBody, "domain" | "primaryType" | "types" | "message"> {
  const typeNames = Object.keys(types).filter((name) => !PRIMARY_SKIP.has(name));
  const resolvedPrimary = primaryType ?? eip712PrimaryType(types, typeNames);
  if (!resolvedPrimary) {
    throw new KmsError("TYPED_DATA", "typed data has no primary type");
  }
  const fields = types[resolvedPrimary];
  if (!fields) {
    throw new KmsError("TYPED_DATA", `unknown primary type ${resolvedPrimary}`);
  }

  return {
    domain: {
      name: domain.name,
      version: domain.version,
      chainId: domain.chainId === undefined ? undefined : Number(domain.chainId),
      verifyingContract: domain.verifyingContract,
    },
    primaryType: resolvedPrimary,
    types: typeNames.map((name) => ({
      name,
      fields: (types[name] ?? []).map((field) => ({ name: field.name, type: field.type })),
    })),
    message: fields.map((field) => ({
      name: field.name,
      value: encodeKmsValue(field.type, value[field.name]),
    })),
  };
}

function eip712PrimaryType(
  types: Record<string, Array<{ name: string; type: string }>>,
  typeNames: string[],
): string | undefined {
  const declared = new Set(typeNames);
  const referenced = new Set<string>();
  for (const name of typeNames) {
    for (const field of types[name] ?? []) {
      const base = field.type.replace(/\[\d*\]$/u, "");
      if (declared.has(base) && base !== name) {
        referenced.add(base);
      }
    }
  }
  const roots = typeNames.filter((name) => !referenced.has(name));
  if (roots.length !== 1) {
    throw new KmsError("TYPED_DATA", "typed data has no unique primary type");
  }
  return roots[0];
}

function encodeKmsValue(solType: string, raw: unknown): unknown {
  if (raw === undefined) {
    throw new KmsError("TYPED_DATA", `missing message field for type ${solType}`);
  }
  if (solType.startsWith("uint") || solType.startsWith("int")) {
    if (typeof raw === "bigint") {
      return raw.toString();
    }
    if (typeof raw === "number") {
      return String(raw);
    }
    if (typeof raw === "string") {
      return raw;
    }
    throw new KmsError("TYPED_DATA", `cannot encode ${solType}`);
  }
  return raw;
}
