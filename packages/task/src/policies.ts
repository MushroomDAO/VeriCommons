import {
  ATTRIBUTION_QUALIFIED_V1,
  GITHUB_REPO_STAR_V1,
} from "@vericommons/kernel";
import type { TaskPolicy } from "./types.js";

export const GITHUB_STAR_TASK_ID = "plaza.github.star.tlsn";
export const ATTRIBUTION_SIGNUP_TASK_ID = "plaza.attribution.channel.signup";

export const DEMO_POLICIES: TaskPolicy[] = [
  {
    taskId: GITHUB_STAR_TASK_ID,
    schema: GITHUB_REPO_STAR_V1,
    mode: "immediate",
    amount: 10,
    once: true,
    cap: 1000,
    fixedParams: { owner: "tlsnotary", repo: "tlsn" },
  },
  {
    taskId: ATTRIBUTION_SIGNUP_TASK_ID,
    schema: ATTRIBUTION_QUALIFIED_V1,
    mode: "delayed",
    amount: 5,
    once: true,
    cap: 1000,
    fixedParams: { channelId: "channel:alice:wechat", event: "signup" },
  },
];

export function policyById(policies: TaskPolicy[], taskId: string): TaskPolicy | undefined {
  return policies.find((p) => p.taskId === taskId);
}
