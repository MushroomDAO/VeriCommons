import { keccak256, toUtf8Bytes } from "ethers";

/** Deterministic JSON for claim hashing (sorted object keys). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortValue(obj[key]);
    }
    return out;
  }
  return value;
}

export function hashClaim(claim: Record<string, unknown>): string {
  return keccak256(toUtf8Bytes(stableStringify(claim)));
}

export function assertNoSecrets(payload: Record<string, unknown>): void {
  const banned = ["accessToken", "token", "authorization", "cookie", "password"];
  const keys = collectKeys(payload);
  for (const key of keys) {
    if (banned.includes(key)) {
      throw new Error(`secret field leaked into proof payload: ${key}`);
    }
  }
}

function collectKeys(value: unknown, acc: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, acc);
    return acc;
  }
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      acc.push(k);
      collectKeys(v, acc);
    }
  }
  return acc;
}
