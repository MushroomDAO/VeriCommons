import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Wallet } from "ethers";
import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_QUALIFIED_V1,
  createKernel,
  GITHUB_REPO_STAR_V1,
  type EvidenceTicket,
} from "@vericommons/kernel";
import {
  ATTRIBUTION_SIGNUP_TASK_ID,
  DEMO_POLICIES,
  GITHUB_STAR_TASK_ID,
  InMemoryCreditLedger,
  InMemoryTaskStore,
  TaskService,
} from "../src/index.js";

const subject = "0x1111111111111111111111111111111111111111";
const referred = "0x3333333333333333333333333333333333333333";

function mockFetch(routes: Record<string, { status: number; body?: string; json?: unknown }>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const hit = Object.entries(routes)
      .sort(([a], [b]) => b.length - a.length)
      .find(([prefix]) => url === prefix || url.startsWith(prefix));
    if (!hit) {
      return new Response("not mocked", { status: 599 });
    }
    const [, spec] = hit;
    if (spec.json !== undefined) {
      return new Response(JSON.stringify(spec.json), {
        status: spec.status,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(spec.status === 204 ? null : (spec.body ?? ""), { status: spec.status });
  }) as typeof fetch;
}

function githubOkFetch(): typeof fetch {
  return mockFetch({
    "https://api.github.com/user/starred/": { status: 204 },
    "https://api.github.com/user": { status: 200, json: { login: "alice" } },
  });
}

async function setup(opts?: { fetchImpl?: typeof fetch; now?: number }) {
  const signer = Wallet.createRandom();
  const kernel = createKernel({
    signer,
    fetchImpl: opts?.fetchImpl ?? githubOkFetch(),
    clock: opts?.now !== undefined ? { now: () => opts.now! } : undefined,
  });
  const ledger = new InMemoryCreditLedger();
  const store = new InMemoryTaskStore();
  const tasks = new TaskService({
    kernel,
    expectedIssuer: signer.address,
    ledger,
    store,
    policies: DEMO_POLICIES,
    clock: opts?.now !== undefined ? { now: () => opts.now! } : undefined,
  });
  return { signer, kernel, ledger, store, tasks };
}

describe("P2 plaza + credits", () => {
  it("kernel remains importable without this plaza package", async () => {
    const kernelPkg = JSON.parse(
      readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../kernel/package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    expect(kernelPkg.dependencies?.["@vericommons/task"]).toBeUndefined();
    const kernel = await import("@vericommons/kernel");
    expect(kernel.createKernel).toBeTypeOf("function");
    expect("TaskService" in kernel).toBe(false);
  });

  it("immediate GitHub star task grants credits from our ticket only", async () => {
    const { tasks, ledger } = await setup();
    const result = await tasks.claim({
      taskId: GITHUB_STAR_TASK_ID,
      subject,
      params: { accessToken: "test-token" },
    });
    expect(result.status).toBe("PASS");
    expect(result.ticket?.schema).toBe(GITHUB_REPO_STAR_V1);
    expect(result.ticket?.trust.assumption).toBe("SELF");
    expect(result.creditGrant).toEqual({
      evidenceId: result.creditGrant?.evidenceId,
      schema: GITHUB_REPO_STAR_V1,
      subject,
      amount: 10,
    });
    expect(ledger.grants).toHaveLength(1);
    expect(ledger.grants[0]).toEqual(result.creditGrant);
    expect(JSON.stringify(result)).not.toContain("test-token");
    expect(result.creditGrant).not.toHaveProperty("payload");
    expect(JSON.stringify(ledger.grants)).not.toMatch(/httpStatus|accessToken|zkpass/i);
  });

  it("one-time GitHub task does not grant twice", async () => {
    const { tasks, ledger } = await setup();
    const first = await tasks.claim({
      taskId: GITHUB_STAR_TASK_ID,
      subject,
      params: { accessToken: "test-token" },
    });
    expect(first.status).toBe("PASS");
    const second = await tasks.claim({
      taskId: GITHUB_STAR_TASK_ID,
      subject,
      params: { accessToken: "test-token" },
    });
    expect(second.status).toBe("FAIL");
    expect(second.reason).toBe("ALREADY_CLAIMED");
    expect(ledger.grants).toHaveLength(1);
  });

  it("delayed attribution is PENDING until qualified, then PASS + credits", async () => {
    const { tasks, ledger } = await setup();
    const pending = await tasks.claim({
      taskId: ATTRIBUTION_SIGNUP_TASK_ID,
      subject: referred,
      params: { qualified: false },
    });
    expect(pending.status).toBe("PENDING");
    expect(pending.ticket).toBeUndefined();
    expect(pending.creditGrant).toBeUndefined();
    expect(ledger.grants).toHaveLength(0);

    const pass = await tasks.claim({
      taskId: ATTRIBUTION_SIGNUP_TASK_ID,
      subject: referred,
      params: { qualified: true },
    });
    expect(pass.status).toBe("PASS");
    expect(pass.ticket?.schema).toBe(ATTRIBUTION_QUALIFIED_V1);
    expect(pass.ticket?.proof.type).toBe("RESULT_ATTRIBUTION");
    expect(pass.creditGrant?.amount).toBe(5);
    expect(pass.creditGrant?.schema).toBe(ATTRIBUTION_QUALIFIED_V1);
    expect(ledger.grants).toHaveLength(1);
  });

  it("reuses an already issued kernel ticket without talking to GitHub again", async () => {
    const { tasks, kernel, ledger } = await setup();
    const proof = await kernel.prove({
      schema: GITHUB_REPO_STAR_V1,
      subject,
      params: { owner: "tlsnotary", repo: "tlsn", accessToken: "test-token" },
    });
    const ticket = await kernel.issue(await kernel.verify(proof));
    const result = await tasks.claim({
      taskId: GITHUB_STAR_TASK_ID,
      subject,
      ticket,
    });
    expect(result.status).toBe("PASS");
    expect(result.ticket?.nonce).toBe(ticket.nonce);
    expect(ledger.grants[0]?.subject).toBe(subject);
  });

  it("rejects a ticket with empty trust.assumption", async () => {
    const { tasks, kernel } = await setup();
    const proof = await kernel.prove({
      schema: GITHUB_REPO_STAR_V1,
      subject,
      params: { owner: "tlsnotary", repo: "tlsn", accessToken: "x" },
    });
    const ticket = (await kernel.issue(await kernel.verify(proof))) as EvidenceTicket;
    const stripped = { ...ticket, trust: { assumption: "" as never } };
    const result = await tasks.claim({
      taskId: GITHUB_STAR_TASK_ID,
      subject,
      ticket: stripped,
    });
    expect(result.status).toBe("FAIL");
    expect(result.reason).toBe("TRUST");
  });

  it("rejects an expired ticket", async () => {
    const issuedAt = 1_700_000_000;
    const { tasks, kernel } = await setup({ now: issuedAt });
    const proof = await kernel.prove({
      schema: GITHUB_REPO_STAR_V1,
      subject,
      params: { owner: "tlsnotary", repo: "tlsn", accessToken: "x" },
    });
    const ticket = await kernel.issue(await kernel.verify(proof));
    const late = new TaskService({
      kernel,
      expectedIssuer: ticket.issuer,
      ledger: new InMemoryCreditLedger(),
      store: new InMemoryTaskStore(),
      policies: DEMO_POLICIES,
      clock: { now: () => ticket.validUntil + 1 },
    });
    const result = await late.claim({ taskId: GITHUB_STAR_TASK_ID, subject, ticket });
    expect(result.status).toBe("FAIL");
    expect(result.reason).toBe("EXPIRED");
  });
});
