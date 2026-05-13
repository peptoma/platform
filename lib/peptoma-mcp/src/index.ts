import { createServer } from "./server.js";

const G = "\x1b[92m";
const D = "\x1b[32m";
const W = "\x1b[97m";
const DIM = "\x1b[2m";
const R = "\x1b[0m";
const RED = "\x1b[91m";
const GOLD = "\x1b[93m";

const BANNER = `
${G} ██████╗ ███████╗██████╗ ████████╗ ██████╗ ███╗   ███╗ █████╗ ${R}
${G} ██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔═══██╗████╗ ████║██╔══██╗${R}
${G} ██████╔╝█████╗  ██████╔╝   ██║   ██║   ██║██╔████╔██║███████║${R}
${G} ██╔═══╝ ██╔══╝  ██╔═══╝    ██║   ██║   ██║██║╚██╔╝██║██╔══██║${R}
${G} ██║     ███████╗██║        ██║   ╚██████╔╝██║ ╚═╝ ██║██║  ██║${R}
${G} ╚═╝     ╚══════╝╚═╝        ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝${R}
${D}   Open DeSci Peptide Research Platform  ·  MCP Server v0.1.6   ${R}
${DIM}   peptoma.xyz  ·  $PEPTM  ·  Solana                            ${R}
`;

const DIVIDER = `${D}${"─".repeat(62)}${R}`;

function parseArgs(): Record<string, string> {
  const result: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        result[key] = next;
        i++;
      } else {
        result[key] = "true";
      }
    }
  }
  return result;
}

const flags = parseArgs();

function printHelp() {
  console.error(BANNER);
  console.error(DIVIDER);
  console.error(`
${W}USAGE${R}
  ${G}peptoma-mcp${R} --wallet ${D}<your_solana_address>${R}
  ${G}PEPTOMA_WALLET${R}=<address> ${G}peptoma-mcp${R}

${W}OPTIONS${R}
  ${G}--wallet${R}    <address>  Your Solana wallet address (beta access)
  ${G}--base-url${R} <url>       Override API base URL
  ${G}--status${R}               Show live platform dashboard & exit
  ${G}--help${R}                 Show this help

${W}HOW TO CONNECT YOUR AI AGENT${R}  ${DIM}(2 steps)${R}

  ${GOLD}Step 1${R}  ${W}Run the MCP server${R}
          ${G}npx peptoma-mcp --wallet${R} ${D}<your_solana_address>${R}

          ${DIM}Example:${R}
          npx peptoma-mcp --wallet 8PAdZPAEEaD5gfJxbC1fFp4q7cpCNHhz4ycQMdT8P8Lg

  ${GOLD}Step 2${R}  ${W}Add to your AI client config${R}

          ${DIM}Claude Desktop  ~/.claude/claude_desktop_config.json${R}
          {
            "mcpServers": {
              "peptoma": {
                "command": "npx",
                "args": ["peptoma-mcp", "--wallet", "${D}<your_address>${R}"]
              }
            }
          }

          ${DIM}Cursor / VS Code  .cursor/mcp.json${R}
          {
            "mcpServers": {
              "peptoma": {
                "command": "npx",
                "args": ["peptoma-mcp", "--wallet", "${D}<your_address>${R}"]
              }
            }
          }

${W}WHAT YOUR AGENT CAN DO${R}

  ${GOLD}AI Research Agents${R}  ${DIM}(new in v0.1.6)${R}
  ${G}research_peptide${R}    Full peptide profile: mechanism, dosing, citations
  ${G}build_protocol${R}      Curated peptide stack for longevity, recovery, sleep, etc.
  ${G}compare_peptides${R}    Side-by-side comparison table of two peptides
  ${G}summarize_literature${R} Structured summary of a paper, abstract, or topic
  ${G}check_safety${R}        Risk analysis: contraindications, interactions, red flags

  ${GOLD}Platform Tools${R}
  ${G}analyze_sequence${R}    Submit peptide to PEPTOMA AI Engine (3 runs/day on FREE tier)
  ${G}get_analysis${R}        Retrieve result by analysis ID
  ${G}search_feed${R}         Search open research feed (filter by disease, score, sort)
  ${G}get_feed_stats${R}      Platform-wide aggregate statistics
  ${G}get_trending${R}        Top 10 sequences by community vote
  ${G}list_annotations${R}    List peer-review annotations for a sequence
  ${G}create_annotation${R}   Submit annotation and earn $PEPTM (confirm/challenge/extend/tag)
  ${G}vote_annotation${R}     Upvote or downvote an annotation
  ${G}get_token_balance${R}   Check $PEPTM balance for a wallet
  ${G}get_leaderboard${R}     Top contributors leaderboard

${W}RUN LIMITS${R}
  ${DIM}FREE${R}        3 analysis runs/day  ${DIM}(current — no staking required)${R}
  ${DIM}RESEARCHER${R}  20 runs/day          ${DIM}(≥500 $PEPTM staked — coming soon)${R}
  ${DIM}PRO${R}         Unlimited            ${DIM}(≥2,000 $PEPTM staked — coming soon)${R}

${W}LINKS${R}
  Platform   ${G}https://peptoma.xyz${R}
  Token      ${G}https://peptoma.xyz/token${R}
  npm        ${G}https://npmjs.com/package/peptoma-mcp${R}
  Token CA   ${D}HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump${R}
`);
  console.error(DIVIDER + "\n");
}

function printNoWallet() {
  console.error(BANNER);
  console.error(`${RED}  Error: No wallet address provided.${R}\n`);
  console.error(`${W}  Connect using your Solana wallet address:${R}\n`);
  console.error(`  ${G}npx peptoma-mcp --wallet${R} ${D}<your_solana_address>${R}\n`);
  console.error(`  ${DIM}Or set as environment variable:${R}`);
  console.error(`  export PEPTOMA_WALLET=<your_solana_address>`);
  console.error(`  ${G}npx peptoma-mcp${R}\n`);
  console.error(`  ${DIM}Run ${R}${G}peptoma-mcp --help${R}${DIM} for full setup guide.${R}\n`);
}

async function printStatus(walletAddress?: string, baseUrl?: string) {
  const { PeptomaClient } = await import("peptoma-sdk");
  const client = new PeptomaClient({
    walletAddress,
    ...(baseUrl ? { baseUrl } : {}),
  });

  console.error(BANNER);
  console.error(DIVIDER);
  console.error(`\n${W}  PEPTOMA PLATFORM DASHBOARD${R}\n`);

  try {
    const stats = await client.feed.stats();
    const trending = await client.feed.trending();
    const leaderboard = await client.token.leaderboard();

    console.error(`${G}  PLATFORM STATS${R}`);
    console.error(`  ${DIM}Total Analyses   ${R}${W}${stats.totalAnalyses?.toLocaleString() ?? "–"}${R}`);
    console.error(`  ${DIM}Recent (24h)     ${R}${W}${stats.recentActivity ?? "–"}${R}`);
    console.error(`  ${DIM}Avg Bioactivity  ${R}${W}${stats.avgBioactivityScore != null ? stats.avgBioactivityScore.toFixed(1) : "–"}${R}`);
    console.error(`  ${DIM}Avg Confidence   ${R}${W}${stats.avgConfidenceScore != null ? stats.avgConfidenceScore.toFixed(1) : "–"}${R}`);
    console.error(`  ${DIM}Annotations      ${R}${W}${stats.totalAnnotations?.toLocaleString() ?? "–"}${R}`);
    console.error(`  ${DIM}Total Votes      ${R}${W}${stats.totalVotes?.toLocaleString() ?? "–"}${R}`);

    if (stats.diseaseBreakdown && stats.diseaseBreakdown.length > 0) {
      console.error(`\n${G}  TOP DISEASE TARGETS${R}`);
      const sorted = [...stats.diseaseBreakdown]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      for (const { disease, count } of sorted) {
        console.error(`  ${DIM}${disease.padEnd(24)}${R}${W}${count}${R}`);
      }
    }

    if (trending.length > 0) {
      console.error(`\n${G}  TRENDING SEQUENCES${R}  ${DIM}(by community votes)${R}`);
      for (let i = 0; i < Math.min(5, trending.length); i++) {
        const t = trending[i];
        const seq = t.sequence.length > 28 ? t.sequence.slice(0, 25) + "…" : t.sequence;
        const score = t.bioactivityScore != null ? `score:${t.bioactivityScore}` : "";
        console.error(`  ${G}${String(i + 1).padStart(2)}.${R} ${W}${seq.padEnd(30)}${R}${DIM}${score}${R}`);
      }
    }

    if (leaderboard.length > 0) {
      console.error(`\n${G}  TOP CONTRIBUTORS${R}  ${DIM}($PEPTM earned)${R}`);
      for (let i = 0; i < Math.min(5, leaderboard.length); i++) {
        const l = leaderboard[i];
        const name = (l.username && l.username !== l.userId)
          ? l.username.slice(0, 16)
          : l.userId.slice(0, 8) + "…" + l.userId.slice(-4);
        const earned = l.totalTokensEarned ?? 0;
        console.error(`  ${G}${String(i + 1).padStart(2)}.${R} ${W}${name.padEnd(20)}${R}${DIM}${earned.toLocaleString()} $PEPTM  ·  ${l.totalContributions ?? 0} contributions${R}`);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ${RED}Error fetching data: ${msg}${R}`);
  }

  console.error(`\n${DIVIDER}`);
  console.error(`${DIM}  peptoma.xyz  ·  npm i -g peptoma-mcp  ·  --help for setup guide${R}\n`);
}

const walletAddress = flags.wallet || flags.w || process.env.PEPTOMA_WALLET || "";
const baseUrl = flags["base-url"] || process.env.PEPTOMA_BASE_URL;

if (flags.help || flags.h) {
  printHelp();
  process.exit(0);
}

if (flags.status) {
  printStatus(walletAddress || undefined, baseUrl).then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  if (!walletAddress) {
    printNoWallet();
    process.exit(1);
  }

  console.error(BANNER);
  console.error(`${G}  ✓ Starting MCP server…${R}`);
  console.error(`${DIM}  Wallet: ${walletAddress.slice(0, 8)}…${walletAddress.slice(-4)}${R}`);
  console.error(`${DIM}  Connected to peptoma.xyz  ·  FREE tier (3 analyses/day)${R}\n`);

  createServer({ walletAddress, baseUrl }).catch((err) => {
    console.error(`${RED}[peptoma-mcp] Fatal error:${R}`, err);
    process.exit(1);
  });
}
