/** Trust labels. Vendor paths must never be empty or implied. */
export const TrustAssumption = {
  SELF: "SELF",
  VENDOR_ZKPASS: "VENDOR_ZKPASS",
  VENDOR_RECLAIM: "VENDOR_RECLAIM",
  VENDOR_ZKEMAIL_RELAYER: "VENDOR_ZKEMAIL_RELAYER",
  SELF_TLSNOTARY: "SELF_TLSNOTARY",
} as const;

export type TrustAssumption =
  (typeof TrustAssumption)[keyof typeof TrustAssumption];

export const P1_BACKENDS = ["github-api", "public-web", "attribution"] as const;
export const KERNEL_BACKENDS = [...P1_BACKENDS, "onchain"] as const;
export type BackendId = (typeof KERNEL_BACKENDS)[number];
export type P1BackendId = BackendId;
