import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { KernelError, type RawProof, type Verifier } from "@vericommons/kernel";

const MAX_BODY = 64 * 1024;

export interface VerifierServerOptions {
  verifier: Verifier;
}

export function createVerifierServer(opts: VerifierServerOptions): Server {
  return createServer((req, res) => {
    void handleRequest(req, res, opts.verifier);
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, verifier: Verifier): Promise<void> {
  const url = new URL(req.url ?? "/", "http://verifier.local");
  if (req.method === "GET" && url.pathname === "/health") {
    writeJson(res, 200, { ok: true });
    return;
  }
  if (req.method === "POST" && url.pathname === "/verify") {
    try {
      const proof = await readJson(req);
      if (!isRawProof(proof)) {
        writeJson(res, 400, { error: { code: "PROOF", message: "body must be a RawProof" } });
        return;
      }
      const verified = await verifier.verify(proof);
      writeJson(res, 200, verified);
    } catch (err) {
      if (err instanceof KernelError) {
        writeJson(res, 400, { error: { code: err.code, message: err.message } });
        return;
      }
      const message = err instanceof Error ? err.message : "verify failed";
      writeJson(res, 400, { error: { code: "VERIFY", message } });
    }
    return;
  }
  writeJson(res, 404, { error: { code: "NOT_FOUND", message: "use GET /health or POST /verify" } });
}

function isRawProof(value: unknown): value is RawProof {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const proof = value as Record<string, unknown>;
  return (
    typeof proof.schema === "string" &&
    typeof proof.subject === "string" &&
    typeof proof.backend === "string" &&
    typeof proof.observedAt === "number" &&
    typeof proof.payload === "object" &&
    proof.payload !== null
  );
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > MAX_BODY) {
      throw new KernelError("PAYLOAD", "request body too large");
    }
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    throw new KernelError("PROOF", "empty body");
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new KernelError("PROOF", "invalid JSON");
  }
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}
