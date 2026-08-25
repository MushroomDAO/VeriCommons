# Solution — VeriCommons 信息源头

> 本文档从 ChatGPT 分享对话提取并结构化归档，作为后续 Design / Features / Plan 的信息源头。
>
> 来源：[ChatGPT Share — 产品规划整理](https://chatgpt.com/share/6a8c2dc5-8cb0-83ec-a7ac-d9499c22c0a8)
>
> 提取时间：2026-08-24
>
> 对话共四轮，产品定义经历四次收敛。本文按时间顺序保留全部关键判断，避免后续设计丢失原始约束。

---

## 0. 一句话最终定义

**VeriCommons — Open Infrastructure for Verifiable Digital Evidence**

中文：可信证据公共基础设施。

> **VeriCommons turns facts trapped inside digital services into portable, privacy-preserving, verifiable evidence.**

中文表达：

> **让任何已经存在于可信数字服务中的事实，都能够脱离原平台，成为用户可以携带、隐私可控、机器可验证的凭证。**

产品内核不是任务、不是积分、不是 Token、也不是单一 zkTLS 实现。

真正内核是：

```
Web2 Fact
  → Evidence Acquisition
  → Cryptographic Proof
  → Normalized Credential
  → Reward / Access / Identity / Reputation（消费层，可替换）
```

定位：开源公共物品。代码许可 Apache-2.0。规范可单独以 VCIP（VeriCommons Improvement Proposal）开放。

---

## 1. 第一轮：Blog AI Search + Credits + 分享验证

### 1.1 原始问题

已有免费技术 Blog。希望加一个付费后台 AI 搜索引擎：

- Cloudflare Workers
- Workers AI
- Vectorize 向量检索
- D1 + 关键词匹配
- 面向 Agent / AI / Model / Framework / Component 等技术文章

约束：

- Blog 内容继续免费公开
- AI 搜索有成本，不能对所有人开放，否则会被滥用打爆费用
- 默认用户注册后大约能搜 3 次
- 想通过“分享 Blog”换更多搜索额度
- 卡住的问题：如何验证用户真的分享到了微信朋友圈、Twitter、论坛，而不是机器人刷任务

要求：调研成熟“做任务得积分”系统，给出技术方案和产品规划，不要过度发散。

### 1.2 第一轮核心调整

**不要把 Share-to-Earn 做成核心机制。**

应改成 **Contribution / Referral-to-Earn**：

> 不验证“分享动作”，验证分享或贡献产生的结果。

原因有两层：

1. 很多渠道无法可靠验证（尤其是微信朋友圈）。
2. 即使技术上能验证，平台规则也不允许“分享即奖励”。

### 1.3 渠道验证能力（原始调研）

| 渠道 | 能否自动验证 | 方法 | 可信度 |
| --- | --- | --- | --- |
| X / Twitter | 可以 | OAuth + X API | 高 |
| Discord | 可以 | OAuth / Bot API | 高 |
| Telegram 群/频道 | 部分可以 | Bot API（可靠验证通常需要 Bot 管理员权限） | 高 |
| GitHub | 可以 | OAuth + GitHub API | 高 |
| Reddit | 当前较困难 | API 权限收紧 | 中/低 |
| 普通公开论坛 | 部分可以 | 用户提交 URL + 网页抓取 | 中 |
| 个人 Blog | 可以 | Backlink / nonce | 高 |
| 微信朋友圈 | 基本无法可靠自动验证 | 无公开朋友圈读取 API | 低 |
| 私人微信群 | 无法通用验证 | — | 很低 |

截图 + AI Vision 只能证明“存在一张这样的截图”，不能证明：

- 是用户自己的朋友圈
- 内容真的发布过
- 不是 Photoshop
- 不是发完立刻删除
- 不是机器人批量生成截图

因此朋友圈截图不适合作为高价值积分依据。

### 1.4 平台规则约束（必须保留）

**X Developer Policy：** 不应通过金钱或虚拟补偿让用户执行 X 行为（Post / Follow / Repost / Like / Comment / Reply）。`转发 Blog → +5 AI Credits` 属于 virtual compensation for engagement，有政策风险。

**微信：** 外链规则把“分享后给予积分、红包、优惠券、虚拟奖励等”列入诱导分享。朋友圈截图换搜索积分不适合长期采用。

协议层应保持中立：可以支持 `x.user.follows` 这类 Evidence，但 Task Creator 用 `Repost → Token Reward` 必须自己遵守平台规则。

### 1.5 推荐机制：Referral-to-Earn

每个用户一个 Referral Link：

```
https://blog.example.com/article/xxx?r=u_a82F
https://blog.example.com/r/a82F
```

服务器生成签名：`referral_id + user_id + created_at + signature`。

用户可以把链接发到任何地方。系统不关心发到哪里，只关心结果：

```
Referral Link
  → 真实访客
  → 不是自己
  → 停留 / 阅读
  → 注册
  → Email Verify
  → 首次有效使用 Search
  → Qualified Referral
  → 奖励邀请人 Credits
```

绝对不要 `1 click = 1 credit`。

分层：

| Level | 条件 | 奖励 |
| --- | --- | --- |
| 0 Click | 点击 | 只记录，0 Credit |
| 1 Real Visit | Turnstile / 真实浏览 / 最低阅读时间 / 不是自己 | 0 Credit，用于统计 |
| 2 Signup | Referral → Signup → Verified Email | Pending，例如 +2 Credits pending |
| 3 Qualified User | 阅读 ≥ 1 篇文章 + 完成一次 Search | Referrer +5 Credits 正式生效 |

### 1.6 Credits 体系（Blog 参考应用）

不要叫 Points，叫 **AI Credits** = AI 服务使用额度，不是游戏币。

第一版建议：

| 行为 | Credits |
| --- | --- |
| 注册 + Email 验证 | +3 |
| 普通文章阅读 | 免费 |
| Keyword Search | 免费或极低限制 |
| Hybrid Search | 0～1 |
| AI Rerank Search | 1 |
| AI Answer / Summary | 2 |
| Deep Research | 3～5 |
| Qualified Referral | +5 |
| 优质文章/资源提交被采用 | +5 |
| 技术错误修正被接受 | +3 |
| 高质量反馈被采用 | +2 |

必须加 cap：

```
Referral reward ≤ 20 credits/day
Contribution reward ≤ 100 credits/month
```

采用真正 Ledger，不要 `users.credit = 13`。

表：`users / credit_accounts / credit_transactions / reward_claims / tasks / referrals / referral_events / risk_events`

交易示例：`+3 signup_bonus / -2 ai_answer / +5 qualified_referral / -3 deep_search`

D1 `batch()` 有事务语义，足以完成“扣 Credit + 生成 usage record”原子操作。

Credits 和 Rate Limit 是两个系统：

- Rate Limit：防瞬间打爆 API（如 10 req/min/user），Cloudflare Workers Rate Limiting binding 以 `user_id` 为 key。它是 permissive / eventually consistent，不适合精确 accounting。
- Credits：谁有资格使用有成本的 AI 能力，必须放 D1 Ledger。

AI Gateway 可加真实美元保险：Analytics / Logging / Rate Limits / Caching / Spend Limits（按 model / provider / user ID / team / application / custom metadata）。

防线：

```
Turnstile → Account → Worker Rate Limit → Credit Check → AI Gateway Spend Limit → Workers AI
```

Turnstile token 必须服务器端验证，且有时间限制。不要只依赖 IP（学校、公司、移动网络常共用 IP）。优先用 user ID / API key / tenant ID。

### 1.7 成本判断（重要产品决策）

普通 Hybrid Search 很便宜，不应严限：

- Vectorize 官方例子：50,000 vectors + 200,000 searches/month + 768 dim ≈ $1.94/月（未扣套餐包含量）
- BGE-M3 embedding：$0.012 / 1M input tokens
- BGE Reranker：约 $0.003 / 1M tokens

真正要扣 Credits 的是 Ask AI / Deep Search，不是普通搜索。

产品拆分：

```
Search Articles     FREE / generous quota
Ask AI about results    2 Credits
Deep Answer             3 Credits
```

注册给 3 Credits，Search 免费/宽松，Ask AI 消耗 Credits。

### 1.8 Search 技术架构（Blog 参考应用）

```
Blog Content → Chunk / Metadata
  → D1 + FTS5 (keyword/BM25)
  → Vectorize (semantic)
  → Candidate Merge → RRF / Weighted
  → optional BGE Reranker
  → Search Results
       ├─ Open Article (FREE)
       └─ Ask AI (Credits)
```

第一版 Hybrid Ranking：

```
FTS5 Top 20 + Vectorize Top 20
  → Reciprocal Rank Fusion
  → Top 10
  → BGE Reranker
  → Top 5
```

只有 Query 很复杂时再 Query Rewrite。不要每个 Query 先问大型 LLM。

D1 官方支持 SQLite FTS5，不必引入 Elasticsearch / Meilisearch。

### 1.9 Task Verifier 四种类型（后来升级，但原始分类要保留）

1. **API_VERIFIED**：GitHub / Discord / Telegram / X。OAuth 拿 `platform_user_id`，调官方 API。可信度最高。
2. **URL_VERIFIED / Proof-of-Publication**：系统生成 challenge（如 `7KF29`），页面必须同时有 Blog backlink 和 challenge。适合 Blog / 论坛 / GitHub README / 技术社区。
3. **SCREENSHOT_VERIFIED**：Workers AI Vision + OCR。只能当 Low-value proof，不要给大量 Credits。Zealy 的 AI Review 可参考。
4. **RESULT_VERIFIED**：证明“带来了真实用户”（Referral）。可信度最高且跨平台。**最推荐。**

### 1.10 成熟产品调研（第一轮）

**Zealy：** Quest / XP / Rewards / Conditions / X / Discord / Telegram / API task / Screenshot / AI Review / Referral / Account age / follower count / anti-bot / Proof of Humanity。X Task 可验证 Follow / Tweet / Like / Reply / Retweet / Quote Tweet。非常值得参考产品设计，但不建议直接当 Blog Search 核心后端。

**Galxe：** X / Discord / Telegram / YouTube / GitHub / On-chain / Loyalty Points / REST / API / GraphQL / Custom Credential。把 X 验证分成 Non-Authentic（Page Visit / intent）和 Authentic（真正 X API）。证明“用户点击 Share 按钮”绝对不能算验证成功。自定义 REST/API Credential 的架构思想值得参考。

**Human Passport / Gitcoin Passport：** Sybil Resistance / Proof of Humanity。Models API 给 0～100 Humanity Score，有 Action ID。第一版完全没必要，太重且偏 Web3 / wallet identity。明显刷量后再考虑。

**开源：**

- OfferKit：MIT，自托管，loyalty / points ledger / referrals / validation rules / audit log / REST API。TypeScript / Next.js / PostgreSQL / Redis。适合借鉴 Credit + Referral + Ledger，不适合 Social Verification。项目年轻，不建议当关键基础设施。
- RefRef：开源 Referral / Affiliate，self-hosted，AGPLv3。这个规模自己做 `referral_events + credits ledger` 更简单。
- RabbitHole Quest Protocol：on-chain task → token/NFT reward，过于 Web3，不适合 Blog Search。

结论：不要采用巨大第三方 Quest Framework。做一个 Mini Quest / Contribution Engine，放在 Cloudflare Backend 里。

真正应复用 Zealy / Galxe 的抽象是：

> **Task → Verification → Claim → Reward → Risk Control**

而不是照搬 Follow Twitter / Retweet / Join Discord / Earn XP 的 Web3 增长玩法。

### 1.11 第一轮产品循环与优先级

循环：

> **Read → Search → Contribute → Earn → Search**

不要：Search → 没额度 → 被迫分享朋友圈 → 截图 → 换额度。

P0：Auth / Credit Ledger / Search Cost Control / Rate Limit / Turnstile

P1：Referral Attribution / Qualified Referral / Anti-Abuse

P2：Contribution Task Engine / URL Verification / GitHub / Discord / Telegram adapters

P3：Screenshot AI verification / Humanity / Sybil scoring / Advanced social integrations

定位：

> Users do not earn credits by promoting the Blog. They earn credits by contributing real value to the knowledge community.

Blog 侧 Milestone（后来被协议级 M0–M7 覆盖，但仍是第一个参考应用的节奏）：

- M1 AI Search：Auth / D1 FTS5 / Vectorize / BGE-M3 / Hybrid Retrieval / Rerank / AI Answer / Credit Ledger / Rate Limit / Turnstile
- M2 Referral：Referral Link / Click / Signup Attribution / Verified Referral / Pending Reward / Credit Settlement / Basic Fraud Detection
- M3 Contribution：Submit Resource / Report Error / Improve Metadata / Recommend Repository / Submit Article + Task/Submission/Verification/Reward

Referral 反作弊重点：互推、同一浏览器/IP/ASN、时间高度集中、行为路径完全一致、注册后立即消失。Reward 保持 PENDING，不要立即发放。状态：`PENDING → VERIFIED → GRANTED` 或 `PENDING → REJECTED`，必要时 `GRANTED → REVERSED`。

---

## 2. 第二轮：做成独立产品，以链上证明为核心

### 2.1 产品重定义

> 把“任务系统”变成一个 Verifiable Task Protocol：任何应用发布任务 → 不同 Verifier 验证任务 → 生成链上 Attestation → 合约结算 Credits / Reputation / Badge。

最关键一点：

> **区块链负责“证明的登记和奖励结算”，但不能神奇地验证微信朋友圈、X、GitHub 等链下事实。**

核心产品是桥：

> **链下世界 → 可验证证明 → 链上结算**

Blog 只是第一个 Application。以后可接：Developer Community / AI Tool / DAO / Online Course / Open-source Project / Hackathon / Research Community。

不要定义“我做一个 Web3 积分系统”。

应定义：

> **我做一个“Task → Proof → Attestation → Reward”的通用基础设施。**

Credit 太容易被别人实现。真正困难、真正有价值的是：

```
这个人究竟有没有完成这个任务？
  → 谁证明的？
  → 证明依据是什么？
  → 证明是否可以被撤销？
  → 别人能不能独立验证？
```

第三方甚至可以不用我们的 Credits：Proof 可消费为 Credits / NFT Badge / Reputation / Discord Role / API Quota / AI Tokens / Own ERC-20。

### 2.2 Proof 五个等级

**A. Onchain Proof — 最强**

持有某 NFT、`ownerOf()` / `balanceOf()` / event logs / transaction / contract state。可完全 trustless。

**B. Signed API Proof**

GitHub Star、加入 Discord、完成某 SaaS 操作。Verifier 后端调官方 API，不要直接改数据库积分，而是产生 EIP-712 结构化签名：

```
TaskProof {
  taskId, claimant, verifier, evidenceHash,
  issuedAt, expiresAt, nonce, result
}
```

流程：`Verifier API → EIP-712 signed Proof → Smart Contract verify() → Attestation → Reward`

EIP-712 专门为结构化数据签名设计，适合“链下验证、链上消费”。

**C. Web Proof**

写文章介绍项目。系统给 challenge，要求页面同时出现 project URL + challenge。Verifier 抓网页：URL → Fetch → verify backlink → verify challenge → hash evidence → sign Proof。

**D. AI / Human Proof**

教程、技术贡献、项目 Demo。无法机械验证。`submission → AI evaluator → score → optional Human/trusted verifier → Attestation`。必须在链上明确记录 `proofType = AI_REVIEW / verifier / score`。不要假装它和 cryptographic proof 一样可信。

**E. ZK Proof**

证明 GitHub account age > 2 years、follower > 1000、是某组织成员，但不公开账号。`private data → ZK circuit → proof → onchain verifier → attestation`。Sign Protocol 已支持把 ZK verifier 放进 Schema Hook。

### 2.3 不要自己重新发明 Attestation Protocol

MVP 优先比较 **EAS vs Sign Protocol**，不先造自己的 Attestation Registry。创新应在 **Task + Verifier + Reward orchestration**。

**EAS（Ethereum Attestation Service）：** Schema Registry + Attestation Contract + optional Resolver。支持 onchain/offchain attestations。Schema 示例：`taskId / claimant / verifier / evidenceHash / proofType / score / issuedAt / expiresAt`。Attestation UID = 这个 Task Completion 的链上证明。

**Sign Protocol：** Schema / Attestation / Schema Hook / Indexing Service / Onchain / IPFS / Arweave / ZK verification。Schema Hook 可在 create/revoke 时执行自定义 Solidity（whitelist、付款、验证）。实际 attestation 中已有类似 `ProofType / Source / Condition / SourceUserIdHash / Result / Timestamp / UserIdHash` 的结构。和本产品更贴近一点。

### 2.4 Credits 上链决策

**第一版不要发 ERC-20。** Transferable token 会立刻变成市场价格、farming、bot、speculation。

第一版 Credits 应 **Onchain 但 Non-transferable**：

```
mapping(uint256 projectId => mapping(address user => uint256 balance)) credits;
```

这是 Multi-tenant Credit Ledger。每个项目有自己的 Credits。

**Reputation 和 Credits 必须分开：**

- Credit = 可以消费
- Reputation = 不能消费

示例：`AI Credits 23 / Contribution XP 780 / Reputation 82 / Badges: GitHub Contributor, 10 Referrals, Technical Reviewer`

Badge 可真正 Token 化：ERC-5192（基于 ERC-721 的 minimal Soulbound NFT）。MVP 不用 ERC-6909，直接 `CreditLedger` 最好。ERC-6909 是比 ERC-1155 更精简的 multi-token interface，以后若一个合约管理很多种积分资产再研究。

### 2.5 五个核心 Contract

1. `TaskRegistry`：taskId / creator / metadataURI / verifierId / rewardPolicy / startTime / endTime / maxClaims / maxClaimsPerUser / status。不存几十 KB 描述，只存 `metadataURI + metadataHash`。
2. `VerifierRegistry`：verifierId / verifierAddress / proofType / metadataURI / status。例如 GithubVerifier / XVerifier / URLVerifier / TelegramVerifier / ZKVerifier / AIReviewVerifier / HumanReviewVerifier。
3. Proof / Attestation：`TaskCompletionProof`（taskId / claimant / verifier / evidenceHash / proofType / score / timestamp / nonce）
4. `RewardManager`：attestation 合法吗？是否已经 claim？这个 task 应该奖励什么？然后 `settle(attestation)`
5. `CreditLedger`：`credit(projectId, user, amount)` / `debit(...)` / `balanceOf(...)`

协议流程六个词即可成为 SDK API：

```
createTask() → complete → verify() → attest() → claim() → settle() → credit()
```

### 2.6 Verifier 才是未来真正的生态

护城河可能不是合约，而是 **Verifier Marketplace**。第三方可写 GitHub / Telegram / URL / Code Contribution / AI Evaluation / Course Completion / Event Check-in / Shopify Purchase / Stripe Payment / DAO Vote Verifier。

定位像：

> **Zapier / Chainlink，但是专门解决人类任务完成证明。**

Verifier 自身也需要可信度。后期 `VerifierRegistry` 可有 owner / reputation / stake / supported proof types / disputes / slashing。

演进：

- MVP：官方 whitelist
- 第二阶段：multiple trusted verifiers
- 再后面：permissionless verifier + stake + challenge + slash
- 逐渐走向 decentralized verification network

这个路径比一上来搞 DAO / token 稳得多。

### 2.7 用户千万不要感受到 Web3 摩擦

即使底层全部链上，也不要求普通用户 Install MetaMask → buy ETH → switch network → pay gas。

应：`Email / Passkey → Smart Account → Address → Task Proof → Sponsored transaction`

ERC-4337 Paymaster 让第三方替用户支付 UserOperation gas。用户体验仍是 Sign in with email / Credits: 8 / Complete task / Verified / +5 credits。后台才是 Passkey → Smart Account → Verifier signature → Attestation → CreditLedger。

### 2.8 产品边界与商业模式

**Protocol（开源）：** TaskRegistry / VerifierRegistry / Attestation Adapter / RewardManager / CreditLedger / SDK

**Cloud（收费）：** Verifier APIs / Indexer / GraphQL / REST / Dashboard / Webhook / AI Verification / Anti-Sybil / Gas Sponsorship / Analytics

**App（免费参考实现）：** Quest UI / Claim UI / Profile / Credit Page / Leaderboard

商业模式：Protocol free/open source；Hosted Verification $xx/month；API Verification $ per 1K proofs；AI Verification usage based；Gas Sponsorship usage based；Enterprise Verifier custom。

### 2.9 Blog 作为第一个 Dogfooding 应用

Digital Commons Blog：Sign up +3 Credits；Refer qualified reader → ReferralVerifier → Attestation → +5；Submit useful AI repo → AIReviewVerifier → +5；Fix article error → HumanVerifier → +10。AI Search `consume(projectId, user, 2)`。

Blog 同时是：**第一个真实客户 + demo + verifier testbed。**

### 2.10 当时的独立产品定义（第三轮会再收窄）

> A permissionless protocol for creating tasks, verifying real-world or digital actions, issuing attestations, and settling programmable rewards.

中文：一个“可验证任务证明与奖励结算协议”。

**不要定义为 Onchain Quest Platform**，否则很容易被理解成另一个 Galxe。

核心：Task → Verifier → Proof → Attestation → Programmable Reward

最有价值、最值得自己做的是 **Verifier abstraction + Task standard + Reward settlement**。EAS/Sign Protocol 作 attestation infrastructure；EIP-712/1271 处理链下 verifier 签名；4337 + Paymaster 消除普通用户链上摩擦。

当时建议 3 个 milestone：

- M1 Blog 上跑通 Task→Proof→Attestation→Credit
- M2 抽离成 SDK + Task/Verifier Registry
- M3 开放第三方 Verifier + programmable rewards

到 M2 就已经是独立产品。

---

## 3. 第三轮：zkTLS 与 Web2 Evidence 内核

### 3.1 用户补充的关键技术记忆

用户记得有个开源仓库：基于 HTTPS 访问特定网址的结果生成 ZK 证明。

定位到 **Reclaim Protocol 的 `zk-fetch`**：`fetch, but with a zkproof`。仓库 `reclaimprotocol/zk-fetch`。支持任意 HTTPS endpoint，把 request + response + proof 绑定；可隐藏 API Key / Auth Header / cookie / secret params；可只披露 response 一部分。

相邻项目：

- **TLSNotary**（`tlsnotary/tlsn`）：证明某段数据确实来自一次真实 TLS/HTTPS 会话。Rust，MIT / Apache 2.0。有 Browser Extension、WASM、移动端。
- **the3cloud/zktls**：Trustless access web2 from web3。zk + TLS，输出 EVM / Solana / Sui / Aptos / TON verifier。底层 zkVM：RISC Zero / SP1。含 Solidity contracts。
- 另提到 **VEFAS**：给 AI Agent 的 HTTPS 请求/响应生成可验证 zkTLS proof，证明 Agent 真的调用了某个外部服务。

关键变化：不再需要相信 Task Server 说“这个用户完成任务了”。证明直接来源于 GitHub 等 HTTPS response。

zkFetch **不能凭空解决没有 endpoint 的问题**（如微信朋友圈）。但对存在 authenticated HTTPS endpoint 的 Web2 服务（GitHub / X / Reddit / Discord / Strava / Spotify / LinkedIn / 银行 / 电商 / SaaS / 游戏平台），模型变成：

```
Authenticated Web2 Data → zkTLS → Selective Proof → Task Contract → Attestation → Credits
```

这已经不是 Quest Platform，而更像：

> **Web2 Action → Verifiable Web3 Proof Infrastructure**

**zkTLSVerifier 应该成为一等公民，而不是后期功能。**

### 3.2 用户对报告的要求（必须全部覆盖）

1. 横向对比 Reclaim zkFetch、TLSNotary、zkPass、the3cloud/zktls，作为当前协议底层，并给出未来可继续借鉴的建议。
2. 探讨做一个 general 的 Web2 证据，在 Web3 提供去中心、无人参与验证的凭证，从而发放积分。
3. 发放积分的基础设施可以提供，但**不是壁垒和产品内核**。
4. 产品究竟能解决多少现实世界的证明问题——应以**数字世界证明为主**（主要靠 HTTPS）。
5. 列出能达到哪些证明：Twitter 有 API 付费可以拿到；微信这些拿不到的是不做、还有其他解决方案、还是怎样。给出：可做的；应该做但技术达不到的建议。

### 3.3 第三轮五个核心结论

**结论一：产品内核不应该是“任务”或“积分”。**

真正值得做的是 **Web Evidence Protocol**：将 Web2 HTTPS 世界中的数字事实转换为 Web3 可验证 Credential / Attestation 的基础设施。

真正的 API 首先是 `prove() / verify() / credential()`，而不是 `createQuest() / rewardPoints()`。

**结论二：TLSNotary 最值得作为长期底层参考，Reclaim 最适合 MVP。** 不是四选一，从第一天定义 `ProofBackend`，接多个实现。

- MVP / 快速生产：Reclaim
- 长期自主底层：TLSNotary
- 产品设计和 Schema UX：重点借鉴 zkPass
- 未来 full-ZK / zkVM：研究 the3cloud + vlayer
- 标准化：关注 2026 年正在发展的 zkTLS Open Standard

**结论三：“无人参与”可以做到，但“完全没有 Verifier”不是当前 zkTLS 的正确理解。**

普通 TLS 使用对称会话密钥。客户端自己也知道 TLS session 相关密钥，所以“客户端把一段 TLS plaintext 拿出来，然后自己证明它来自服务器”并没有天然可信。主流 zkTLS 都引入某种第三方：Notary / Witness / Validator / MPC participant / TEE / Network observer。区别只是这个第三方看不到明文、无法伪造用户数据、自动运行、可以去中心化、可以多节点、可以被链上验证。

TLSNotary 2026 年强调：Zero Knowledge 并不自动等于 Trustless。在 portable proof 模式下，最终验证者仍然需要信任“是谁见证了这次 TLS session”。

应追求 **No Human Verification**，而不是错误宣传 **No Verifier**。

**结论四：能覆盖大量“数字世界事实”，但不能覆盖任意“现实世界事实”。**

最适合的事实共同特征：某个具有权威性的 Web2 服务，曾经通过 HTTPS 向用户返回了这个事实。

```
Provable Web Fact
  = Authoritative Source
  × Observable HTTPS Response
  × Subject Binding
  × Deterministic Predicate
  × Freshness
```

缺一项，证明就会变弱或不可做。

**结论五：微信朋友圈不是代表性目标，不应该为了它扭曲整个产品。**

没有供普通个人微信使用的、读取“某个人朋友圈是否发布了某条内容”的官方公开接口。即使没有公开 API，只要浏览器里能看到对应数据，zkTLS 仍有可能做。真正问题是个人微信朋友圈主要存在于原生 App，没有像 GitHub、X、LinkedIn 那样稳定、可供浏览器 zkTLS 获取的 Web endpoint。

第一阶段：`Personal WeChat Moments → UNSUPPORTED`。不要投入大量工程去破解它。微信传播任务改用 Referral Result Proof：证明“带来了真实用户”，而不是“发了朋友圈”。

判断平台的正确问题不是“有没有 API”，而是：

> **用户得到这个事实时，背后有没有一个可以证明来源的数字响应。**

“没有公开 API”可以做；“没有可观察的权威数字响应”才是真的做不了。

### 3.4 产品哲学：Provenance，不是 Universal Truth

zkTLS 能证明：

```
At time T, server S returned data D for authenticated context U.
```

不能自动证明 `D` 是现实世界绝对真相。LinkedIn 说 Alice works at OpenAI，zkTLS 只能证明 LinkedIn 当时确实返回了这句话，不能证明 Alice 在现实世界一定真的在那里工作。

### 3.5 真正的壁垒

不是 smart contract，不是 credit token，甚至不是单一 zkTLS 实现。

真正能形成壁垒的是 Web Evidence Network：

1. Schema Registry
2. Web2 Source Connectors
3. Browser Request Capture
4. Proof Backend Abstraction
5. Claim Compiler
6. Subject Binding / Nullifier
7. Freshness / Replay Protection
8. Evidence Verification
9. Source/API Change Monitoring
10. Decentralized Verifier Network

特别是 **Claim Compiler**：自然语言 → Find Source → Find HTTPS endpoint → Determine authentication → Determine JSON fields → Build predicate → Generate Schema → Generate Proof。

Reclaim 已开始做 browser network capture → provider generation；zkPass 也开始做自然语言 → schema → browser navigation → proof。

长期产品护城河是：

> **compiler from Web facts to verifiable credentials.**

### 3.6 去中心化逐步实现（不要第一天做 token/DAO）

- V0：Our Verifier + Reclaim/TLSNotary。自动化，但暂时可信。
- V1：Multiple Verifiers + onchain VerifierRegistry
- V2：random verifier assignment + 2-of-3 / N-of-M attestations。高价值任务可以多 verifier。
- V3：permissionless verifier + stake + challenge + slash
- V4：TLS Evidence → succinct ZK compression → direct smart-contract verification。降低对在线 Verifier quorum 的依赖。

第一天不要做 permissionless validators / staking / token / slashing / DAO，很容易把产品做死。

### 3.7 第一阶段吃掉的四大类

不要碰“所有现实世界证明”。先吃掉：

> **Web2 Account State + Web Activity + Web Achievement + Web Transaction Evidence**

已包括：开发者贡献 / 社交账号 / 社区身份 / 职业身份 / 学习成果 / SaaS 使用状态 / 数字资产状态 / 购买/订阅记录 / 内容发布 / Referral。

技术边界：

> **如果 authoritative digital service 已经把事实通过 HTTPS 告诉过用户，那么我们就尽量让这个事实变成用户自己可以带走的 Proof。**

最推荐的架构决定：从第一天就把 Reclaim/TLSNotary 看成可替换的 `ProofBackend`，把 `WebEvidenceCredential` 作为真正协议标准。这样 Reclaim 能很快上线，未来 TLSNotary、zkPass、zkVM、甚至 zkEmail、VC、TEE 都可以进入同一个 Evidence Protocol，而不会推翻产品。

---

## 4. 第四轮：命名与开发计划（对话最后一段，重点）

### 4.1 用户决定

- 产品要起名字
- **作为公共物品开源**
- 需要一份开发计划

### 4.2 命名原则

不要把名字绑定在 zkTLS、Task、Credit 或 Web3 上。内核已经更大：把数字世界中可观察的事实，转换成用户可携带、机器可验证的 Evidence。

### 4.3 选定名称：`VeriCommons`

**VeriCommons — Open Infrastructure for Verifiable Digital Evidence**

中文：可信证据公共基础设施。

`Veri` = Verification / Verifiable；`Commons` = 公共物品属性。未来从 HTTPS/zkTLS 扩展到 zkEmail、VC、TEE、on-chain proof 都不用改名字。

已做项目名初筛（非正式商标 clearance）：

| 候选 | 结果 |
| --- | --- |
| OpenEvidence | 已是很大的医疗 AI 品牌，避开 |
| Open Proof Protocol | 已有 Web3 项目，避开 |
| WebProof | 已有 Web provenance 规范，避开 |
| VeriWeb | 已有 2025–2026 年学术 benchmark，避开 |
| EvidenceMesh | 正在运行的新项目，避开 |
| **VeriCommons** | 该轮公开检索未发现明显同类项目冲突 |

备选：

1. **Proof Commons** — 更容易理解，但 Proof 过于泛化，8/10
2. **OpenVerity** — 品牌感较强，但“公共基础设施”意味没有 VeriCommons 强，7.5/10

**选择：VeriCommons。**

品牌结构：

```
VeriCommons
├── Evidence Protocol
├── Schema Registry
├── Proof Backends（Reclaim / TLSNotary / Public Web / Onchain）
├── Evidence SDK
├── Verifier
└── Reference Apps
    └── Blog Contribution / Credits
```

### 4.4 开发原则

> **先证明一个完整的 Evidence 能从 Web2 产生，并在链上被第三方独立验证。**

第一个版本甚至不要有 Credit。不要先做一个“大协议”。

完整 M0–M7 开发计划见 `docs/Plan.md`。压缩图：

```
M0 Evidence Credential Spec
 → M1 GitHub → Reclaim → Evidence → Chain
 → M2 ProofBackend（Reclaim + TLSNotary）
 → M3 Open Schema Registry
 → M4 Browser Evidence
 → M5 AI Claim / Schema Compiler
 → M6 Decentralized Verifier Network
 → M7 Rewards / Credits / Reputation
```

**M0–M3 看成第一个真正完整版本。**

达到 M3 时可以公开说：

> VeriCommons is an open public infrastructure that turns facts from existing digital services into portable, privacy-preserving and independently verifiable evidence.

Blog 作为第一个 reference application：

> 完成 Web2 contribution → VeriCommons Evidence → 获得 AI Credits。

即使未来 Rewards、Web3、甚至某条链都换掉，VeriCommons 最核心的东西——**Evidence 标准、Schema Registry、Proof Backend 和 Web→Proof compiler——依然成立。**

### 4.5 开源公共物品原则（从一开始确定）

- **代码许可：Apache-2.0。** 对协议、SDK、合约、TLSNotary adapter 都尽量采用 permissive license。Apache-2.0 对专利授权也比 MIT 更完整，适合基础设施。注意：`reclaimprotocol/zk-fetch` 当前是 AGPL，不要让核心协议直接成为它的 fork。
- **Specification 单独开放。** RFC / Schema Specification 可采用 CC BY 4.0 或类似开放许可。
- VCIP 系列：
  - VCIP-0001 Evidence Credential
  - VCIP-0002 Schema Definition
  - VCIP-0003 Proof Backend Interface
  - VCIP-0004 Subject Binding
  - VCIP-0005 Freshness & Replay
- 五条坚持：
  - No mandatory token
  - No mandatory chain
  - No mandatory prover
  - No mandatory verifier
  - No vendor lock-in

### 4.6 第一版仓库结构

```
vericommons/
├── packages/
│   ├── protocol
│   ├── sdk
│   ├── schemas
│   └── proof-backends
├── backends/
│   └── reclaim
├── contracts/
│   └── EvidenceRegistry.sol
├── examples/
│   └── github-proof
├── apps/
│   └── playground
├── docs/
└── RFC/
```

重点：先让开发者 10 分钟能够完成一次 Proof。

---

## 5. 明确的非目标（Non-goals）

必须始终守住：

1. 不做微信朋友圈分享验证（至少第一阶段完全不做）。
2. 不做私人微信群、WhatsApp 私信、Signal 消息证明（E2EE / 无可观察权威响应）。
3. 不承诺证明“真的读完文章”“真的喜欢这个内容”“从未发过某条内容”（主观事实 / absence proof）。
4. 不把 Share-to-Earn / 诱导分享做成核心增长机制。
5. 第一版不发 transferable ERC-20。
6. 第一版不做 token / DAO / staking / slashing / validator economy。
7. 第一版不主动进入金融高风险场景（技术上可支持，商业谨慎）。
8. 不把产品宣传成 No Verifier / 完全 Trustless zkTLS。正确口号是 No Human Verification。
9. 不把自己定义为另一个 Galxe / Onchain Quest Platform。
10. 不为了证明任意现实世界事实而扭曲协议。Physical presence 另建 Proof（QR/NFC/issuer）。
11. 不要让普通用户感受到 MetaMask / gas / 切链。
12. 不要让核心协议变成 Reclaim API Wrapper 或 AGPL fork。

---

## 6. 文档索引

| 文档 | 内容 |
| --- | --- |
| [Design.md](./Design.md) | 产品与协议架构、Credential 标准、合约边界、UX、商业分层 |
| [Features.md](./Features.md) | 功能拆解：协议能力、Schema 家族、参考应用、护城河 |
| [Plan.md](./Plan.md) | M0–M7 开发计划、退出标准、去中心化阶段、仓库结构 |
| [Tech-zkTLS.md](./Tech-zkTLS.md) | zkTLS 横向对比与底层选型 |
| [Proof-Matrix.md](./Proof-Matrix.md) | 可证明/不可证明清单、平台矩阵、语义边界 |
| [Technical-Reserves.md](./Technical-Reserves.md) | 相邻技术储备、标准、开源项目、未来后端 |
| [Changes.md](./Changes.md) | 变更记录 |
