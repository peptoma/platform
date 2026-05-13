import type { MetaplexWalletAdapter } from "@/contexts/wallet-utils";

export type MintResult = {
  mintAddress: string;
  txSignature: string;
};

/**
 * HTTP RPC goes through our backend proxy (avoids CORS/403 on public endpoints).
 * WebSocket confirmation goes DIRECTLY to Solana mainnet — browser WebSockets
 * are not subject to the same CORS restrictions as HTTP, and our proxy only
 * handles HTTP POST so WebSocket would fall back to slow polling and cause
 * "block height exceeded" timeouts.
 */
function getRpcUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/rpc/solana`;
  }
  return "https://rpc.ankr.com/solana";
}

// Direct WebSocket endpoint — bypasses our HTTP proxy for fast tx confirmation.
const WS_ENDPOINT = "wss://api.mainnet-beta.solana.com";

function isBlockheightError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return msg.includes("blockheight") || msg.includes("block height") || msg.includes("blockhashnotfound");
}

export async function mintNFTOnChain({
  metadataUri,
  name,
  symbol,
  walletAdapter,
  onStep,
}: {
  metadataUri: string;
  name: string;
  symbol: string;
  walletAdapter: MetaplexWalletAdapter;
  onStep?: (step: string) => void;
}): Promise<MintResult> {
  onStep?.("Loading Metaplex…");

  const { Metaplex, walletAdapterIdentity } = await import("@metaplex-foundation/js");
  const { Connection } = await import("@solana/web3.js");

  onStep?.("Connecting to Solana…");

  // HTTP RPC → our proxy, WebSocket → direct Solana mainnet for fast confirmation.
  const connection = new Connection(getRpcUrl(), {
    commitment: "confirmed",
    wsEndpoint: WS_ENDPOINT,
    disableRetryOnRateLimit: false,
    confirmTransactionInitialTimeout: 180_000,
  });

  const metaplex = Metaplex.make(connection).use(
    walletAdapterIdentity(walletAdapter as Parameters<typeof walletAdapterIdentity>[0]),
  );

  // Retry once on block-height expiry — each attempt gets a fresh blockhash
  // (the user will be asked to approve in their wallet each attempt).
  const MAX_ATTEMPTS = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (attempt > 1) {
        onStep?.(`Transaction expired, retrying (attempt ${attempt}/${MAX_ATTEMPTS}) — approve again in your wallet…`);
      } else {
        onStep?.("Building transaction — approve in your wallet…");
      }

      const { nft, response } = await metaplex.nfts().create({
        uri: metadataUri,
        name,
        symbol,
        sellerFeeBasisPoints: 250,
        isMutable: false,
      });

      onStep?.("Confirmed on Solana!");

      return {
        mintAddress: nft.address.toString(),
        txSignature: response.signature,
      };
    } catch (e) {
      lastError = e;
      if (attempt < MAX_ATTEMPTS && isBlockheightError(e)) {
        // Transient expiry — retry with fresh blockhash
        continue;
      }
      break;
    }
  }

  throw lastError;
}
