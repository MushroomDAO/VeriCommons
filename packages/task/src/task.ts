import {
  assertTicketSignature,
  hashClaim,
  KernelError,
  type EvidenceTicket,
  type Kernel,
} from "@vericommons/kernel";
import { policyById } from "./policies.js";
import type {
  ClaimInput,
  ClaimResult,
  Clock,
  CreditGrant,
  CreditLedger,
  TaskPolicy,
  TaskStore,
} from "./types.js";

type TicketOutcome = { ok: true; ticket: EvidenceTicket } | { ok: false; result: ClaimResult };

export interface TaskServiceOptions {
  kernel: Kernel;
  expectedIssuer: string;
  ledger: CreditLedger;
  store: TaskStore;
  policies: TaskPolicy[];
  clock?: Clock;
  chainId?: number;
  verifyingContract?: string;
}

export class TaskService {
  private readonly kernel: Kernel;
  private readonly expectedIssuer: string;
  private readonly ledger: CreditLedger;
  private readonly store: TaskStore;
  private readonly policies: TaskPolicy[];
  private readonly clock: Clock;
  private readonly chainId: number;
  private readonly verifyingContract: string;

  constructor(opts: TaskServiceOptions) {
    this.kernel = opts.kernel;
    this.expectedIssuer = opts.expectedIssuer;
    this.ledger = opts.ledger;
    this.store = opts.store;
    this.policies = opts.policies;
    this.clock = opts.clock ?? { now: () => Math.floor(Date.now() / 1000) };
    this.chainId = opts.chainId ?? 1;
    this.verifyingContract = opts.verifyingContract ?? "0x0000000000000000000000000000000000000000";
  }

  /**
   * Plaza entry: bind a kernel ticket to taskId.
   * Credits are granted only on PASS. This package never issues tickets itself.
   */
  async claim(input: ClaimInput): Promise<ClaimResult> {
    const policy = policyById(this.policies, input.taskId);
    if (!policy) {
      return fail(input, "UNKNOWN_TASK");
    }

    const now = this.clock.now();
    if (policy.windowEndsAt !== undefined && now > policy.windowEndsAt) {
      return fail(input, "WINDOW");
    }
    if (policy.once && this.store.getBySubject(policy.taskId, input.subject)) {
      return fail(input, "ALREADY_CLAIMED");
    }
    if (policy.cap !== undefined && this.store.countPass(policy.taskId) >= policy.cap) {
      return fail(input, "CAP");
    }

    const ticketResult = input.ticket
      ? this.acceptTicket(input.ticket, policy, input.subject, now)
      : await this.obtainTicket(policy, input);

    if (!ticketResult.ok) {
      return ticketResult.result;
    }
    const { ticket } = ticketResult;

    const spentNonce = this.store.getByNonce(ticket.nonce);
    if (spentNonce) {
      return fail(input, "TICKET_SPENT");
    }

    const creditGrant: CreditGrant = {
      evidenceId: hashClaim({
        taskId: policy.taskId,
        nonce: ticket.nonce,
        schema: ticket.schema,
        subject: ticket.subject,
      }),
      schema: ticket.schema,
      subject: ticket.subject,
      amount: policy.amount,
    };

    this.store.record({
      taskId: policy.taskId,
      subject: input.subject,
      evidenceId: creditGrant.evidenceId,
      nonce: ticket.nonce,
      grantedAt: now,
    });
    await this.ledger.grant(creditGrant);

    return {
      status: "PASS",
      taskId: policy.taskId,
      subject: input.subject,
      ticket,
      creditGrant,
    };
  }

  private acceptTicket(
    ticket: EvidenceTicket,
    policy: TaskPolicy,
    subject: string,
    now: number,
  ): TicketOutcome {
    if (!ticket.trust?.assumption) {
      return { ok: false, result: fail({ taskId: policy.taskId, subject }, "TRUST") };
    }
    try {
      assertTicketSignature(
        ticket,
        this.expectedIssuer,
        this.chainId,
        this.verifyingContract,
      );
    } catch {
      return { ok: false, result: fail({ taskId: policy.taskId, subject }, "BAD_TICKET") };
    }
    if (ticket.schema !== policy.schema) {
      return { ok: false, result: fail({ taskId: policy.taskId, subject }, "SCHEMA_MISMATCH") };
    }
    if (ticket.subject !== subject) {
      return { ok: false, result: fail({ taskId: policy.taskId, subject }, "SUBJECT_MISMATCH") };
    }
    if (now > ticket.validUntil) {
      return { ok: false, result: fail({ taskId: policy.taskId, subject }, "EXPIRED") };
    }
    return { ok: true, ticket };
  }

  private async obtainTicket(
    policy: TaskPolicy,
    input: ClaimInput,
  ): Promise<TicketOutcome> {
    const params = {
      ...input.params,
      ...policy.fixedParams,
    };
    try {
      const proof = await this.kernel.prove({
        schema: policy.schema,
        subject: input.subject,
        params,
      });
      const verified = await this.kernel.verify(proof);
      if (!verified.trust.assumption) {
        return { ok: false, result: fail(input, "TRUST") };
      }
      const issued = await this.kernel.issue(verified);
      return { ok: true, ticket: issued };
    } catch (err) {
      if (err instanceof KernelError && err.code === "NOT_QUALIFIED" && policy.mode === "delayed") {
        return {
          ok: false,
          result: {
            status: "PENDING",
            taskId: policy.taskId,
            subject: input.subject,
            reason: "NOT_QUALIFIED",
          },
        };
      }
      if (err instanceof KernelError) {
        return { ok: false, result: fail(input, err.code) };
      }
      throw err;
    }
  }
}

function fail(input: Pick<ClaimInput, "taskId" | "subject">, reason: string): ClaimResult {
  return {
    status: "FAIL",
    taskId: input.taskId,
    subject: input.subject,
    reason,
  };
}
