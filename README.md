# PEPTOMA

**Open DeSci platform for peptide research. Secured on Solana. Archived on Arweave.**

PEPTOMA is a decentralized science (DeSci) platform where researchers submit peptide sequences for AI analysis, peer-review community annotations, and permanent on-chain archiving. Every analysis is tokenized, community-reviewed, and stored permanently on Arweave.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS + Framer Motion |
| Backend | Express 5 + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Blockchain | Solana (SPL tokens, staking tiers) |
| Permanent storage | Arweave (via direct transaction) |
| Validation | Zod v4 + drizzle-zod |
| API contract | OpenAPI 3 → Orval codegen |
| Monorepo | pnpm workspaces |

---

## Repository Structure

```
peptoma/
├── artifacts/
│   ├── api-server/          # Express REST API
│   └── peptoma/             # React frontend (Vite)
├── lib/
│   ├── api-client-react/    # Orval-generated React Query hooks
│   ├── api-spec/            # OpenAPI 3 spec + codegen config
│   ├── api-zod/             # Orval-generated Zod schemas
│   ├── db/                  # Drizzle ORM schema + migrations
│   ├── integrations-openai-ai-server/  # OpenAI AI server integration
│   └── peptoma-sdk/         # Public JS/TS SDK
├── scripts/                 # Utility scripts
├── pnpm-workspace.yaml      # Workspace catalog + overrides
└── tsconfig.base.json       # Shared TypeScript config
```

---

## Features

### The Lab (`/lab`)
Submit peptide sequences (up to 50 AA) for AI analysis. Choose standard or deep analysis depth. Results include:
- Bioactivity score (0–100) + label
- Secondary structure prediction (α-helix / β-sheet / random coil / mixed)
- Toxicity risk classification (low / medium / high)
- Estimated half-life and molecular weight
- AI-suggested research directions

### Research Feed (`/feed`)
Public feed of all submitted sequences with sort/filter by disease target, bioactivity score, and recency. Live global stats panel.

### Annotate (`/annotate/:id`)
Full annotation view with 4-type community peer-review:
- **Confirm** (+2 pts) — agree with the AI classification
- **Challenge** (+3 pts) — dispute with reasoning
- **Extend** (+5 pts) — add related sequences or supporting data
- **Tag** (+2 pts) — add disease/target labels

Export panel per sequence:
- **Benchling ELN** — direct export to your Benchling project
- **GenBank deposit** — `.gp` file for NCBI submission
- **bioRxiv preprint** — auto-generated manuscript template
- **Opentrons SPPS protocol** — `.py` file for OT-2 robot (Fmoc SPPS)
- **Arweave archive** — permanent on-chain link

### Mission Control (`/missions`)
Personal dashboard with run history, token earnings breakdown, and API key management.

### $PEPTOMA Token (`/token`)
Staking interface, live governance preview panel, and contributor leaderboard.

| Tier | Staked | Runs/day | Features |
|---|---|---|---|
| FREE | 0 | 3 | Standard depth |
| RESEARCHER | 500 | 20 | Deep analysis |
| PRO | 2,000 | ∞ | API access, priority queue |
| LAB | 10,000 | ∞ | Governance 3× weight, research grants |

### Governance (`/governance`)
On-chain voting on protocol proposals. Stake-weighted votes. 4 categories: reward rates, tier requirements, scoring, policy.

### Events (`/events`)
7-day Top Contributor Challenge leaderboard.

### For Agents (`/agents`)
Full API documentation for autonomous agent integration.

---

## Token Rewards

| Action | Cost | Earn |
|---|---|---|
| Submit sequence (standard) | −1 $PEPTM | +5 $PEPTM |
| Submit sequence (deep) | −5 $PEPTM | +5 $PEPTM |
| Confirm annotation | — | +2 $PEPTM |
| Challenge annotation | — | +3 $PEPTM |
| Extend annotation | — | +5 $PEPTM |
| Tag annotation | — | +2 $PEPTM |

$PEPTM CA (Solana): `HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump`

---

## API

Base URL: `https://peptoma.xyz/api`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/sequences` | Submit peptide for analysis |
| GET | `/sequences/:id` | Get sequence by ID |
| GET | `/feed` | Public feed (filters: disease, minScore, sort, page) |
| GET | `/feed/stats` | Global stats |
| GET | `/feed/trending` | Top sequences by vote count |
| POST | `/annotations` | Create annotation |
| GET | `/annotations/:sequenceId` | Get annotations for a sequence |
| POST | `/annotations/:id/vote` | Vote on annotation |
| GET | `/missions` | User dashboard |
| GET | `/missions/earnings` | Token earnings breakdown |
| GET | `/token/balance` | User token balance + tier |
| GET | `/token/leaderboard` | Top contributors |
| GET | `/governance/proposals` | All proposals with user vote |
| POST | `/governance/proposals/:id/vote` | Cast governance vote |

Full API docs at `/agents`.

---

## Database Schema

Key tables (PostgreSQL):

- `sequences` — peptide sequences + full AI analysis results
- `annotations` — community peer-review entries (confirm/challenge/extend/tag)
- `user_tokens` — balances, staked amounts, staking tier (free/researcher/pro/lab), Solana address
- `governance_proposals` — protocol proposals with yes/no weighted votes
- `governance_votes` — individual votes by wallet address

---

## Development

### Prerequisites

- Node.js 24+
- pnpm 10+
- PostgreSQL 16+

### Setup

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push-force

# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend
pnpm --filter @workspace/peptoma run dev
```

### Key Commands

```bash
# Full typecheck
pnpm run typecheck

# Regenerate API hooks from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Build all packages
pnpm run build
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ARWEAVE_KEY` | Arweave wallet JWK (JSON string) for permanent archiving |
| `PINATA_JWT` | Pinata JWT for IPFS pinning |
| `SESSION_SECRET` | Express session secret |
| `TREASURY_PRIVATE_KEY` | Solana treasury wallet private key |

---

## Arweave Integration

Every peptide analysis and community annotation is permanently archived to Arweave after submission. The transaction ID is stored in the database and displayed as a permanent link on each sequence page.

First confirmed archival: [`LG43C9LtrS3veG51TRF-YVpZjvceyvoIEFK-HLFt-OU`](https://arweave.net/LG43C9LtrS3veG51TRF-YVpZjvceyvoIEFK-HLFt-OU)

---

## Opentrons Integration

PEPTOMA generates Opentrons OT-2 compatible Fmoc SPPS Python protocols directly from top-ranked peptide hits. Download the `.py` file from any sequence's annotate page and upload directly to the Opentrons App for simulation and automated synthesis runs.

---

## License

MIT

---

*PEPTOMA — Open DeSci. All research publicly verifiable.*  
*peptoma.xyz | $PEPTM | Solana + Arweave*
