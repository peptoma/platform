# peptoma-sdk

> Official TypeScript / JavaScript SDK for the [PEPTOMA](https://peptoma.xyz) open DeSci platform — AI-powered peptide sequence analysis, community peer-review, and on-chain research incentives on Solana.

[![npm version](https://img.shields.io/npm/v/peptoma-sdk?color=00e5cc&labelColor=0d1117)](https://www.npmjs.com/package/peptoma-sdk)
[![license](https://img.shields.io/npm/l/peptoma-sdk?color=00e5cc&labelColor=0d1117)](./LICENSE)
[![types](https://img.shields.io/npm/types/peptoma-sdk?color=00e5cc&labelColor=0d1117)](https://www.npmjs.com/package/peptoma-sdk)

---

## Overview

PEPTOMA is an open decentralised science (DeSci) platform for peptide research. It combines proprietary PEPTOMA AI Engine analysis with a community peer-review system and on-chain Solana incentives.

This SDK gives developers programmatic access to every platform capability: sequence submission, feed retrieval, annotation, voting, API key management, and token data.

---

## Installation

```bash
npm install peptoma-sdk
# or
pnpm add peptoma-sdk
# or
yarn add peptoma-sdk
```

**Requirements:** Node.js ≥ 18 (native `fetch`). Works in Bun and Deno environments as well.

---

## Authentication

API keys are available to **PRO** (≥ 2,000 $PEPTM staked) and **LAB** (≥ 10,000 $PEPTM staked) tier wallets.

Generate your key from [Mission Control → API Keys](https://peptoma.xyz/missions) on the platform.

Keys follow the format `pptm_<48-char-hex>` and are passed automatically as a Bearer token by the client.

> **Security:** Keys are shown only once at generation time. Store them in an environment variable or secret manager — never commit them to source control.

---

## Quick Start

```typescript
import { PeptomaClient } from "peptoma-sdk";

const client = new PeptomaClient({
  apiKey: process.env.PEPTOMA_API_KEY!, // pptm_...
});

// Analyze a peptide sequence
const result = await client.sequences.analyze({
  sequence: "KWLRRVWRPQKI",
  depth: "standard",        // "standard" | "deep"
  diseaseTarget: "MRSA",   // optional
});

console.log(result.bioactivityScore);  // 91
console.log(result.bioactivityLabel);  // "antimicrobial"
console.log(result.toxicityRisk);      // "low"
console.log(result.confidenceScore);   // 84
```

---

## API Reference

### `new PeptomaClient(options)`

| Option    | Type     | Required | Description                                      |
|-----------|----------|----------|--------------------------------------------------|
| `apiKey`  | `string` | Yes      | Your PEPTOMA API key (`pptm_...`)                |
| `baseUrl` | `string` | No       | Override base URL (default: `https://peptoma.xyz/api`) |

---

### `client.sequences`

#### `.analyze(options)` → `Promise<SequenceAnalysis>`

Submit a peptide sequence for AI analysis using the PEPTOMA AI Engine.

```typescript
const result = await client.sequences.analyze({
  sequence: "KWLRRVWRPQKI",       // required — single-letter amino acid codes
  userId: "your_wallet_address",  // optional — links to your on-chain identity
  diseaseTarget: "MRSA",          // optional — organism or disease context
  notes: "AMP candidate",         // optional — research notes
  depth: "deep",                  // optional — "standard" (default) | "deep"
});
```

**`SequenceAnalysis` response fields:**

| Field                  | Type               | Description                                        |
|------------------------|--------------------|----------------------------------------------------|
| `id`                   | `number`           | Unique sequence ID                                 |
| `sequence`             | `string`           | Input amino acid sequence                          |
| `status`               | `string`           | `"completed"` \| `"processing"` \| `"failed"`     |
| `bioactivityScore`     | `number`           | Predicted bioactivity (0–100)                      |
| `bioactivityLabel`     | `string`           | Class: `"antimicrobial"`, `"antiviral"`, `"hormonal"`, etc. |
| `confidenceScore`      | `number`           | Model confidence (0–100)                           |
| `structurePrediction`  | `string`           | `"alpha_helix"` \| `"beta_sheet"` \| `"random_coil"` \| `"mixed"` |
| `toxicityRisk`         | `string`           | `"low"` \| `"medium"` \| `"high"`                 |
| `molecularWeight`      | `number`           | Exact molecular weight (Da) — deterministic calc   |
| `hydrophobicityIndex`  | `number`           | Kyte-Doolittle GRAVY score                         |
| `chargeAtPH7`          | `number`           | Net charge at physiological pH                     |
| `halfLife`             | `string`           | Estimated plasma half-life e.g. `"~8h (s.c.)"`    |
| `tags`                 | `string[]`         | Auto-generated classification tags                 |
| `annotationSuggestions`| `string[]`         | AI-generated peer-review prompts for community     |
| `voteCount`            | `number`           | Community consensus vote count                     |
| `annotationCount`      | `number`           | Total peer-review annotations                      |
| `diseaseTarget`        | `string \| null`   | Supplied disease/organism target                   |
| `createdAt`            | `string`           | ISO 8601 timestamp                                 |

#### `.get(id)` → `Promise<SequenceAnalysis>`

Retrieve a previously submitted sequence by numeric ID.

```typescript
const result = await client.sequences.get(42);
```

---

### `client.feed`

#### `.list(options?)` → `Promise<FeedResponse>`

Fetch the public research feed with optional filtering and sorting.

```typescript
const { items, total, page, totalPages } = await client.feed.list({
  limit: 20,               // results per page (default: 20)
  page: 1,                 // page number (default: 1)
  disease: "Cancer",       // filter by disease target
  minScore: 70,            // minimum bioactivity score
  sort: "score",           // "newest" | "score" | "annotations" | "trending"
});
```

**`FeedResponse` fields:**

| Field        | Type                 | Description               |
|--------------|----------------------|---------------------------|
| `items`      | `SequenceAnalysis[]` | Sequences on this page    |
| `total`      | `number`             | Total matching sequences  |
| `page`       | `number`             | Current page              |
| `totalPages` | `number`             | Total pages available     |

#### `.stats()` → `Promise<FeedStats>`

Platform-wide aggregate statistics.

```typescript
const stats = await client.feed.stats();
// { totalAnalyses, avgBioactivityScore, avgConfidenceScore, totalAnnotations, totalVotes, recentActivity, diseaseBreakdown }
```

**`FeedStats` fields:**

| Field                 | Type                       | Description                        |
|-----------------------|----------------------------|------------------------------------|
| `totalAnalyses`       | `number`                   | Total sequences analyzed           |
| `avgBioactivityScore` | `number`                   | Platform average bioactivity score |
| `avgConfidenceScore`  | `number`                   | Platform average confidence score  |
| `totalAnnotations`    | `number`                   | Total community annotations        |
| `totalVotes`          | `number`                   | Total consensus votes              |
| `recentActivity`      | `number`                   | Analyses in last 24 hours          |
| `diseaseBreakdown`    | `DiseaseBreakdownItem[]`   | Count per disease target           |

#### `.trending()` → `Promise<SequenceAnalysis[]>`

Top 10 sequences ranked by community vote count.

```typescript
const trending = await client.feed.trending();
```

---

### `client.annotations`

#### `.list(sequenceId)` → `Promise<Annotation[]>`

List all peer-review annotations for a given sequence.

```typescript
const annotations = await client.annotations.list(42);
```

#### `.create(options)` → `Promise<Annotation>`

Submit a peer-review annotation. Earns research points redeemable for $PEPTM.

```typescript
const annotation = await client.annotations.create({
  sequenceId: 42,
  userId: "your_wallet_address",
  type: "confirm",              // see annotation types below
  content: "Consistent with APD entry #1824. Confirmed membrane-active AMP.",
});
```

**Annotation types and research point rewards:**

| Type        | Points | Description                                                   |
|-------------|--------|---------------------------------------------------------------|
| `confirm`   | +2     | Agree with the AI classification based on expertise or data   |
| `challenge` | +3     | Dispute the result with evidence, literature, or reasoning    |
| `extend`    | +5     | Add a related sequence, supporting data, or additional analysis |
| `tag`       | +2     | Apply a disease or target label to improve discoverability    |

#### `.vote(annotationId, direction)` → `Promise<VoteResult>`

Upvote or downvote a peer annotation.

```typescript
const { score } = await client.annotations.vote(7, "up"); // "up" | "down"
console.log(score); // updated vote score
```

---

### `client.keys`

Manage API keys programmatically. All methods require the client to be initialised with a PRO or LAB tier key.

#### `.list()` → `Promise<ApiKey[]>`

```typescript
const keys = await client.keys.list();
```

#### `.generate(options?)` → `Promise<GenerateKeyResult>`

```typescript
const { key, id } = await client.keys.generate({ label: "CI pipeline" });
// key = "pptm_..." — displayed once, store securely
```

#### `.revoke(id)` → `Promise<{ success: boolean }>`

```typescript
await client.keys.revoke(3);
```

---

### `client.token`

#### `.balance(userId)` → `Promise<TokenBalance>`

```typescript
const data = await client.token.balance("8PAdZPAEEaD5gfJxbC1fFp4q7cpCNHhz4ycQMdT8P8Lg");
// { userId, balance, stakedAmount, earnedTotal, spentTotal, stakingTier, solanaAddress }
```

**`TokenBalance` fields:**

| Field          | Type           | Description                                  |
|----------------|----------------|----------------------------------------------|
| `userId`       | `string`       | Wallet address / user identifier             |
| `balance`      | `number`       | Current $PEPTM balance                       |
| `stakedAmount` | `number`       | Amount currently staked                      |
| `earnedTotal`  | `number`       | Total ever earned from contributions         |
| `spentTotal`   | `number`       | Total spent on analysis runs                 |
| `stakingTier`  | `string`       | `"free"` \| `"researcher"` \| `"pro"` \| `"lab"` |
| `solanaAddress`| `string\|null` | Linked on-chain Solana address               |

#### `.leaderboard()` → `Promise<LeaderboardEntry[]>`

```typescript
const leaders = await client.token.leaderboard();
// [{ userId, username, totalTokensEarned, totalContributions, rank }, ...]
```

---

## Rate Limits

| Tier         | Staking Requirement | Sequences / Day | API Access |
|--------------|---------------------|-----------------|------------|
| `FREE`       | None                | 3               | No         |
| `RESEARCHER` | ≥ 500 $PEPTM        | 20              | No         |
| `PRO`        | ≥ 2,000 $PEPTM      | Unlimited       | Yes        |
| `LAB`        | ≥ 10,000 $PEPTM     | Unlimited       | Yes        |

Rate limits reset at **midnight UTC**. Exceeded limits return HTTP `429`.

---

## Error Handling

All methods throw a `PeptomaError` on non-2xx responses.

```typescript
import { PeptomaClient } from "peptoma-sdk";
import type { PeptomaError } from "peptoma-sdk";

try {
  const result = await client.sequences.analyze({ sequence: "ACDEF", userId: "wallet" });
} catch (err) {
  const e = err as PeptomaError;

  switch (e.status) {
    case 400: console.error("Bad request:", e.message); break;
    case 401: console.error("Invalid API key"); break;
    case 403: console.error("Tier does not permit this action"); break;
    case 404: console.error("Resource not found"); break;
    case 429: console.error("Daily run limit reached — resets at midnight UTC"); break;
    default:  console.error("Server error:", e.status, e.body);
  }
}
```

**`PeptomaError` properties:**

| Property  | Type      | Description                  |
|-----------|-----------|------------------------------|
| `message` | `string`  | Human-readable error message |
| `status`  | `number`  | HTTP status code             |
| `body`    | `unknown` | Raw response body            |

---

## Complete Example — Automated Screening Pipeline

```typescript
import { PeptomaClient } from "peptoma-sdk";

const client = new PeptomaClient({ apiKey: process.env.PEPTOMA_API_KEY! });

const CANDIDATES = [
  { sequence: "KWLRRVWRPQKI",                             target: "MRSA" },
  { sequence: "GIINTLQKYYCRVRGGRCAVLSCLPKEEQIGKCSTRGRK",  target: "E. coli" },
  { sequence: "ACDEFGHIKLMNPQRSTVWY",                      target: "Candida" },
];

async function runScreen() {
  console.log(`Screening ${CANDIDATES.length} candidates...`);

  const results = await Promise.all(
    CANDIDATES.map(({ sequence, target }) =>
      client.sequences.analyze({
        sequence,
        depth: "deep",
        diseaseTarget: target,
        userId: "pipeline_bot",
      })
    )
  );

  const hits = results.filter(
    r =>
      r.bioactivityScore >= 75 &&
      r.bioactivityLabel === "antimicrobial" &&
      r.toxicityRisk === "low" &&
      r.confidenceScore >= 70
  );

  console.log(`\n${hits.length} / ${results.length} passed quality filter:`);
  for (const hit of hits) {
    console.log(
      `  ✓ #${hit.id} — score: ${hit.bioactivityScore}, ` +
      `confidence: ${hit.confidenceScore}, target: ${hit.diseaseTarget}`
    );

    await client.annotations.create({
      sequenceId: hit.id,
      userId: "pipeline_bot",
      type: "confirm",
      content:
        `Automated deep screen pass — bioactivity ${hit.bioactivityScore}/100, ` +
        `confidence ${hit.confidenceScore}/100, toxicity: ${hit.toxicityRisk}.`,
    });
  }
}

runScreen().catch(console.error);
```

---

## TypeScript Types

All types are exported from the package root — no separate `@types` package required.

```typescript
import type {
  PeptomaClientOptions,
  SequenceAnalysis,
  AnalyzeOptions,
  AnalysisDepth,
  StructurePrediction,
  ToxicityRisk,
  StakingTier,
  SortOption,
  FeedOptions,
  FeedResponse,
  FeedStats,
  DiseaseBreakdownItem,
  Annotation,
  AnnotationType,
  CreateAnnotationOptions,
  VoteDirection,
  VoteResult,
  ApiKey,
  GenerateKeyOptions,
  GenerateKeyResult,
  TokenBalance,
  LeaderboardEntry,
  PeptomaError,
} from "peptoma-sdk";
```

---

## Links

| Resource      | URL                                                          |
|---------------|--------------------------------------------------------------|
| Platform      | [peptoma.xyz](https://peptoma.xyz)                           |
| Documentation | [peptoma.xyz/docs](https://peptoma.xyz/docs)                 |
| Feed          | [peptoma.xyz/feed](https://peptoma.xyz/feed)                 |
| Token CA      | `HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump`              |
| X / Twitter   | [@Peptoma_xyz](https://x.com/Peptoma_xyz)                   |
| npm           | [npmjs.com/package/peptoma-sdk](https://www.npmjs.com/package/peptoma-sdk) |

---

## License

MIT © 2026 PEPTOMA Team
