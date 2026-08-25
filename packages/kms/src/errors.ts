export class KmsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "KmsError";
    this.code = code;
  }
}
