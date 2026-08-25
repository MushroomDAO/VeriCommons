import type { SpendRecord, TaskStore } from "./types.js";

export class InMemoryTaskStore implements TaskStore {
  private readonly bySubject = new Map<string, SpendRecord>();
  private readonly byNonce = new Map<string, SpendRecord>();
  private readonly passCount = new Map<string, number>();

  getBySubject(taskId: string, subject: string): SpendRecord | undefined {
    return this.bySubject.get(key(taskId, subject));
  }

  getByNonce(nonce: string): SpendRecord | undefined {
    return this.byNonce.get(nonce);
  }

  countPass(taskId: string): number {
    return this.passCount.get(taskId) ?? 0;
  }

  record(record: SpendRecord): void {
    this.bySubject.set(key(record.taskId, record.subject), record);
    this.byNonce.set(record.nonce, record);
    this.passCount.set(record.taskId, this.countPass(record.taskId) + 1);
  }
}

function key(taskId: string, subject: string): string {
  return `${taskId}:${subject}`;
}
