import { Transaction, PublicKey } from "@solana/web3.js";

export interface MetaplexWalletAdapter {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions: (txs: Transaction[]) => Promise<Transaction[]>;
}

export type WalletId = "phantom" | "solflare" | "backpack";

export type SolProvider = {
  isConnected?: boolean;
  publicKey?: { toString(): string } | null;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  signAndSendTransaction(tx: Transaction): Promise<{ signature: string }>;
  signTransaction?(tx: Transaction): Promise<Transaction>;
  signAllTransactions?(txs: Transaction[]): Promise<Transaction[]>;
};

export function getProvider(id: WalletId): SolProvider | null {
  try {
    const w = window as unknown as Record<string, unknown>;

    if (id === "phantom") {
      const p = (w.phantom as Record<string, unknown> | undefined)?.solana as SolProvider | undefined;
      return p?.connect ? p : null;
    }

    if (id === "solflare") {
      // Solflare injects itself as window.solflare
      const p = w.solflare as SolProvider | undefined;
      if (p?.connect) return p;

      // Newer Solflare versions may also live under window.SolflareApp
      const p2 = (w.SolflareApp as Record<string, unknown> | undefined)?.solana as SolProvider | undefined;
      if (p2?.connect) return p2;

      return null;
    }

    if (id === "backpack") {
      const p = (w.backpack as Record<string, unknown> | undefined)?.solana as SolProvider | undefined;
      return p?.connect ? p : null;
    }
  } catch { /* extension not available */ }
  return null;
}

export function getAnyProvider(): SolProvider | null {
  return (
    getProvider("phantom") ??
    getProvider("solflare") ??
    getProvider("backpack") ??
    null
  );
}
