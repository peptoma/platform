# peptoma-mcp

> Official MCP (Model Context Protocol) server for [PEPTOMA](https://peptoma.xyz) — connect any AI agent to the open DeSci peptide research platform.

[![npm version](https://img.shields.io/npm/v/peptoma-mcp?color=00e5cc&labelColor=0d1117)](https://www.npmjs.com/package/peptoma-mcp)
[![license](https://img.shields.io/npm/l/peptoma-mcp?color=00e5cc&labelColor=0d1117)](./LICENSE)

---

## What This Does

`peptoma-mcp` runs a local MCP server that exposes PEPTOMA's full research platform as tools to any compatible AI agent — Claude Desktop, Cursor, VS Code, Zed, and any other MCP-compatible client.

Once connected, your AI agent can:

- Submit peptide sequences for AI analysis and receive bioactivity scores, structure predictions, toxicity risk, and half-life estimates
- Search and filter the open PEPTOMA research feed of thousands of analyzed sequences
- Read and write peer-review annotations to earn $PEPTM token rewards
- Query token balances, staking tiers, and the contributor leaderboard

No custom code required. Install, configure, and your agent is connected to the live PEPTOMA platform.

---

## Requirements

- Node.js ≥ 18
- A PEPTOMA API key (`pptm_...`) — available to **PRO** (≥ 2,000 $PEPTM staked) and **LAB** (≥ 10,000 $PEPTM staked) tier wallets
- Generate your key at [peptoma.xyz/missions](https://peptoma.xyz/missions)

---

## Quick Start

```bash
# Run directly with npx (no install needed)
npx peptoma-mcp --api-key pptm_your_key_here

# Or install globally
npm install -g peptoma-mcp
peptoma-mcp --api-key pptm_your_key_here

# Or use environment variable
export PEPTOMA_API_KEY=pptm_your_key_here
npx peptoma-mcp
```

---

## Claude Desktop Setup

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "peptoma": {
      "command": "npx",
      "args": ["peptoma-mcp", "--api-key", "pptm_your_key_here"]
    }
  }
}
```

Restart Claude Desktop. You will now see PEPTOMA tools available in your conversations.

---

## Cursor Setup

Add to your Cursor MCP config (`.cursor/mcp.json` or global config):

```json
{
  "mcpServers": {
    "peptoma": {
      "command": "npx",
      "args": ["peptoma-mcp", "--api-key", "pptm_your_key_here"]
    }
  }
}
```

---

## VS Code (Copilot Agent Mode)

Add to `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "peptoma": {
      "type": "stdio",
      "command": "npx",
      "args": ["peptoma-mcp", "--api-key", "pptm_your_key_here"]
    }
  }
}
```

---

## Available Tools

Once connected, these tools are available to your AI agent:

### `analyze_sequence`
Submit a peptide sequence for analysis by the PEPTOMA AI Engine.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sequence` | string | Yes | Single-letter amino acid code or FASTA format (3–512 residues) |
| `depth` | `"standard"` \| `"deep"` | No | Analysis depth (default: `"standard"`) |
| `diseaseTarget` | string | No | Disease or organism context (e.g. `"MRSA"`, `"Cancer"`) |
| `userId` | string | No | Solana wallet address for on-chain attribution |
| `notes` | string | No | Research notes |

**Returns:** Full `SequenceAnalysis` object with bioactivity score, label, structure, toxicity, MW, hydrophobicity, charge, half-life, confidence, and annotation suggestions.

---

### `get_analysis`
Retrieve a previous analysis by ID.

**Inputs:** `id` (number)

---

### `search_feed`
Search the open PEPTOMA research feed.

**Inputs:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `disease` | string | Filter by disease target |
| `minScore` | number | Minimum bioactivity score (0–100) |
| `sort` | `"newest"` \| `"score"` \| `"annotations"` \| `"trending"` | Sort order |
| `limit` | number | Results per page (default: 20) |
| `page` | number | Page number (default: 1) |

---

### `get_feed_stats`
Platform-wide statistics: total analyses, average scores, annotation counts, disease breakdown.

---

### `get_trending`
Top 10 sequences ranked by community vote count.

---

### `list_annotations`
List all peer-review annotations for a sequence.

**Inputs:** `sequenceId` (number)

---

### `create_annotation`
Submit a peer-review annotation and earn $PEPTM.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sequenceId` | number | Yes | Target sequence ID |
| `userId` | string | Yes | Your wallet address (for token rewards) |
| `type` | `"confirm"` \| `"challenge"` \| `"extend"` \| `"tag"` | Yes | Annotation type |
| `content` | string | No | Your scientific reasoning or evidence |

**Reward rates:** confirm +2, challenge +3, extend +5, tag +2 $PEPTM

---

### `vote_annotation`
Upvote or downvote an annotation.

**Inputs:** `annotationId` (number), `direction` (`"up"` | `"down"`)

---

### `get_token_balance`
Get $PEPTM balance and staking info for a user.

**Inputs:** `userId` (string — Solana wallet address)

---

### `get_leaderboard`
Top contributors ranked by total $PEPTM earned.

---

## Example Agent Sessions

**Screening antimicrobial candidates:**
```
You: Screen these sequences for MRSA activity and flag anything above 80 with low toxicity:
     KWLRRVWRPQKI, FLPLIGRVLSGIL, GIINTLQKYYCRVRGGRCAVLSCLPKEEQIGKCSTRGRK

Agent:
  → analyze_sequence("KWLRRVWRPQKI", disease: "MRSA") → score: 91, toxic: low ✓
  → analyze_sequence("FLPLIGRVLSGIL", disease: "MRSA") → score: 67, toxic: medium ✗
  → analyze_sequence("GIINTLQKYYCRVRGGRCAVLSCLPKEEQIGKCSTRGRK", disease: "MRSA") → score: 88, toxic: low ✓

  2 candidates passed: #1 and #3. Submitting confirmation annotations...
  → create_annotation(sequenceId: 1, type: "confirm", content: "High AMP score, low toxicity...")
  → create_annotation(sequenceId: 3, type: "confirm", content: "Defensin-class AMP candidate...")
```

**Researching what's in the feed:**
```
You: What are the top cancer peptides on PEPTOMA right now?

Agent:
  → search_feed({ disease: "Cancer", sort: "score", limit: 10 })
  Returns ranked list with bioactivity scores, structure types, and annotation counts.
```

**Building a research report:**
```
You: Give me a summary of the PEPTOMA platform activity today

Agent:
  → get_feed_stats() → totalAnalyses: 1,247, recentActivity: 34, avgScore: 71.4
  → get_trending() → top 10 sequences with community vote counts
  → get_leaderboard() → top 5 contributors this period
```

---

## CLI Options

```
peptoma-mcp [options]

Options:
  --api-key <key>     Your PEPTOMA API key (pptm_...)
  --base-url <url>    Override API base URL (default: https://peptoma.xyz/api)
  --help              Show help
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PEPTOMA_API_KEY` | Your PEPTOMA API key — alternative to `--api-key` flag |
| `PEPTOMA_BASE_URL` | Override API base URL |

---

## Links

| Resource | URL |
|----------|-----|
| Platform | [peptoma.xyz](https://peptoma.xyz) |
| Docs | [peptoma.xyz/docs](https://peptoma.xyz/docs) |
| npm (SDK) | [npmjs.com/package/peptoma-sdk](https://www.npmjs.com/package/peptoma-sdk) |
| npm (MCP) | [npmjs.com/package/peptoma-mcp](https://www.npmjs.com/package/peptoma-mcp) |
| Token CA | `HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump` |

---

## License

MIT © 2026 PEPTOMA Team
