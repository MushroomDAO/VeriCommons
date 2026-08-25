# Cursor Cloud Agent vs local

Official: [Cloud Agents](https://cursor.com/docs/cloud-agent) · [Pricing](https://cursor.com/docs/models-and-pricing)

## How to start

1. Paid Cursor plan (Hobby cannot run Cloud Agents).
2. Admin connects GitHub / GitLab / Bitbucket / Azure DevOps.
3. Start a task:
   - Desktop: agent input dropdown → **Cloud**
   - Web: [cursor.com/agents](https://cursor.com/agents)
   - iOS app; Slack / GitHub / Linear `@Cursor`
4. First use: set a **spend limit**. On-demand billing is typically required to start runs.
5. Uncommitted local files are **not** on the VM. Push the repo first.

## Pricing and free quota

- **No separate free Cloud Agent product.** Hobby has limited local Agent, not Cloud.
- Paid plans (Pro $20 / Pro+ $60 / Ultra $200, plus Teams) **include Cloud Agents** and a monthly **model usage pool**. Cloud Agent tokens draw that pool at the **selected model's API price**. VM **Builds are not billed extra**.
- When the pool is empty: enable on-demand (pay-as-you-go) or upgrade. Dashboard: [cursor.com/dashboard/usage](https://cursor.com/dashboard/usage).
- There is **no unlimited free Cloud quota**. Included usage is the “free within the subscription” bucket.

## vs local Cursor Agent

| | Local | Cloud |
| --- | --- | --- |
| Where it runs | Your laptop | Cursor VM |
| Close laptop | Stops | Continues |
| Code it sees | Your working tree | Clone from remote |
| Secrets | Your `.env`, local MCP | Dashboard secrets / env snapshot |
| MCP | Your `~/.cursor/mcp.json` | Team/cloud MCP config |
| Best for | Explore, local keys, this chat | Defined tasks, PR, leave the desk |

Mac Mini in the lab is a third option: always-on **local** agent, not Cloud. Use Cloud to close the notebook; use Mini when you need that machine's network.

## How to send a VeriCommons task to Cloud

This local chat cannot become a Cloud Agent. Start a **new** agent with **Cloud** selected, after the repo is pushed.

Copy-paste (edit the phase):

```
Repo: MushroomDAO/VeriCommons
Follow docs/plan/README.md and docs/plan/P2-plaza-credits.md only.
Do not expand scope. Do not modify docs/Solution.md.
Invariants: issue() only in packages/kernel; plaza/credits consume our tickets; set trust.assumption; no AGPL in kernel.
Run: pnpm install && pnpm test && pnpm build
Open a PR when tests pass.
```

Desktop: agent input dropdown → **Cloud**. Web: [cursor.com/agents](https://cursor.com/agents). GitHub: comment `@cursor` on an issue with the same text.

