export class KernelError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "KernelError";
    this.code = code;
  }
}
