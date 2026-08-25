import type { EvidenceTicket } from "@vericommons/kernel";

export type TaskStatus = "PASS" | "FAIL" | "PENDING";
export type TaskMode = "immediate" | "delayed";

export interface TaskPolicy {
  taskId: string;
  schema: string;
  mode: TaskMode;
  amount: number;
  once: boolean;
  cap?: number;
  windowEndsAt?: number;
  fixedParams: Record<string, unknown>;
}

export interface CreditGrant {
  evidenceId: string;
  schema: string;
  subject: string;
  amount: number;
}

export interface CreditLedger {
  grant(grant: CreditGrant): Promise<void> | void;
}

export interface SpendRecord {
  taskId: string;
  subject: string;
  evidenceId: string;
  nonce: string;
  grantedAt: number;
}

export interface TaskStore {
  getBySubject(taskId: string, subject: string): SpendRecord | undefined;
  getByNonce(nonce: string): SpendRecord | undefined;
  countPass(taskId: string): number;
  record(record: SpendRecord): void;
}

export interface Clock {
  now(): number;
}

export interface ClaimInput {
  taskId: string;
  subject: string;
  params?: Record<string, unknown>;
  ticket?: EvidenceTicket;
}

export interface ClaimResult {
  status: TaskStatus;
  taskId: string;
  subject: string;
  reason?: string;
  ticket?: EvidenceTicket;
  creditGrant?: CreditGrant;
}
