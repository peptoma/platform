import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Ankr first — more permissive rate limits than the public endpoint
const SOLANA_ENDPOINTS = [
  "https://rpc.ankr.com/solana",
  "https://api.mainnet-beta.solana.com",
  "https://solana-mainnet.rpc.extrnode.com",
];

async function forwardToSolana(payload: string): Promise<unknown> {
  let lastError = "All endpoints failed";

  for (const endpoint of SOLANA_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status} from ${endpoint}`;
        continue;
      }

      return await response.json();
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  throw new Error(lastError);
}

router.post("/rpc/solana", async (req, res) => {
  const body = req.body as unknown;

  // Support both single RPC calls ({ method, ... }) and
  // batch calls ([ { method, ... }, ... ]) that Metaplex/web3.js may send
  const isBatch = Array.isArray(body);

  if (!isBatch) {
    const single = body as { method?: string };
    if (!single.method) {
      res.status(400).json({ error: "Missing method" });
      return;
    }
  }

  try {
    const payload = JSON.stringify(body);
    const data = await forwardToSolana(payload);
    res.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    req.log.warn({ err: msg }, "All Solana RPC endpoints failed");
    res.status(502).json({ error: msg });
  }
});

export default router;
