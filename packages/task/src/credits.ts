import type { CreditGrant, CreditLedger } from "./types.js";

/** Test / local stand-in. Production plaza injects the real credit API. */
export class InMemoryCreditLedger implements CreditLedger {
  readonly grants: CreditGrant[] = [];

  grant(grant: CreditGrant): void {
    this.grants.push({ ...grant });
  }
}
