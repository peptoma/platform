import React, {
  createContext, useContext, useRef, useState,
  useCallback, useEffect, type ReactNode,
} from "react";
import { Transaction, Connection, PublicKey } from "@solana/web3.js";
import { WalletSelectModal } from "@/components/ui/wallet-select-modal";
import {
  type WalletId, type SolProvider, type MetaplexWalletAdapter,
  getProvider, getAnyProvider,
} from "@/contexts/wallet-utils";


const PEPTOMA_CA = "HopMHHPfSV2kWQLghKt6xR1oWbPRLA2UyxnKGoPpump";
const SESSION_KEY = "peptoma_wallet";

export type { MetaplexWalletAdapter };

interface WalletContextValue {
  connected: boolean;
  address: string | null;
  connecting: boolean;
  connectError: string | null;
  userId: string;
  shortAddress: string | null;
  privyReady: boolean;
  solBalance: number | null;
  peptomBalance: number | null;
  balancesLoading: boolean;
  connect: () => void;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  sendTransaction: (tx: Transaction, connection: Connection) => Promise<string>;
  getWalletAdapter: () => MetaplexWalletAdapter | null;
}

// ── RPC proxy helpers ─────────────────────────────────────────────────────────
// Routes through our own API server to avoid browser CORS restrictions.

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch("/api/rpc/solana", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC proxy HTTP ${res.status}`);
  const json = await res.json() as { result?: unknown; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result;
}

async function fetchSolBalance(address: string): Promise<number> {
  new PublicKey(address); // validate — throws if bad address
  const result = await rpcCall("getBalance", [address, { commitment: "confirmed" }]);
  return ((result as { value?: number } | null)?.value ?? 0) / 1e9;
}

async function fetchPeptomaBalance(address: string): Promise<number> {
  new PublicKey(address); // validate
  const result = await rpcCall("getTokenAccountsByOwner", [
    address,
    { mint: PEPTOMA_CA },
    { encoding: "jsonParsed", commitment: "confirmed" },
  ]);
  type TA = { account?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmount?: number } } } } } };
  const accounts = (result as { value?: TA[] } | null)?.value ?? [];
  return accounts[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
}

function getOrCreateAnonId(): string {
  const key = "peptoma_anon_id";
  try {
    const v = localStorage.getItem(key);
    if (v) return v;
    const id = `anon-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `anon-${Math.random().toString(36).slice(2, 10)}`;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

// Persist context identity across Vite HMR reloads so Provider/consumer
// always share the same object even when the module is re-evaluated.
const _g = globalThis as Record<string, unknown>;
const WalletContext: React.Context<WalletContextValue | null> =
  (_g.__peptomaWalletCtx as React.Context<WalletContextValue | null>) ??
  createContext<WalletContextValue | null>(null);
_g.__peptomaWalletCtx = WalletContext;

export function WalletProvider({ children }: { children: ReactNode }) {
  const anonId = useRef(getOrCreateAnonId());

  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [peptomBalance, setPeptomBalance] = useState<number | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    // Check if wallet still connected
    const provider = getAnyProvider();
    if (provider?.isConnected && provider.publicKey) {
      setAddress(provider.publicKey.toString());
    } else if (provider?.publicKey) {
      setAddress(provider.publicKey.toString());
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  // ── Balances ──────────────────────────────────────────────────────────────

  const refreshBalances = useCallback(async () => {
    if (!address) { setSolBalance(null); setPeptomBalance(null); return; }
    setBalancesLoading(true);
    try {
      const [sol, peptom] = await Promise.all([
        fetchSolBalance(address),
        fetchPeptomaBalance(address),
      ]);
      setSolBalance(sol);
      setPeptomBalance(peptom);
    } catch (e) {
      console.error("[wallet] balance fetch failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBalancesLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) refreshBalances();
    else { setSolBalance(null); setPeptomBalance(null); }
  }, [address, refreshBalances]);

  // ── Connect via specific wallet ───────────────────────────────────────────

  const connectWallet = useCallback(async (id: WalletId) => {
    setConnecting(true);
    setConnectError(null);
    setModalOpen(false);
    try {
      const provider = getProvider(id);
      if (!provider) {
        // Wallet not installed — open install page
        const urls: Record<WalletId, string> = {
          phantom: "https://phantom.app",
          solflare: "https://solflare.com",
          backpack: "https://backpack.app",
        };
        window.open(urls[id], "_blank");
        setConnectError(`${id.charAt(0).toUpperCase() + id.slice(1)} not detected. Please install it and refresh the page.`);
        setModalOpen(true);
        return;
      }

      let pubkey: string | null = null;

      try {
        const resp = await provider.connect();
        pubkey = resp.publicKey.toString();
      } catch (err: unknown) {
        // Solflare (and some other wallets) throw non-standard error objects like {}.
        // After throwing, the provider often still has .publicKey set — check it as fallback.
        const errObj = err as Record<string, unknown> | null;
        const code = errObj?.code as number | undefined;
        const msg = errObj?.message as string | undefined;

        // Code 4001 = user explicitly rejected
        if (code === 4001 || msg?.toLowerCase().includes("reject") || msg?.toLowerCase().includes("cancel")) {
          return; // Silent — user cancelled
        }

        // Try reading publicKey directly from provider (Solflare sets this even on throw)
        if (provider.publicKey) {
          pubkey = provider.publicKey.toString();
        } else {
          // Give the wallet 400ms to finish injecting, then retry publicKey
          await new Promise(r => setTimeout(r, 400));
          const pk = (provider as SolProvider).publicKey;
          if (pk) {
            pubkey = pk.toString();
          } else {
            const walletName = id.charAt(0).toUpperCase() + id.slice(1);
            setConnectError(`${walletName} connection failed. Make sure the wallet extension is unlocked and try again.`);
            setModalOpen(true);
            console.error("[wallet] connect error", err);
            return;
          }
        }
      }

      if (pubkey) {
        setAddress(pubkey);
        sessionStorage.setItem(SESSION_KEY, pubkey);
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const connect = useCallback(() => {
    setConnectError(null);
    setModalOpen(true);
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    getAnyProvider()?.disconnect().catch(() => {});
    setAddress(null);
    setSolBalance(null);
    setPeptomBalance(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  // ── Send transaction ──────────────────────────────────────────────────────

  const sendTransaction = useCallback(
    async (tx: Transaction, _connection: Connection): Promise<string> => {
      const provider = getAnyProvider();
      if (!provider?.signAndSendTransaction) {
        throw new Error("No Solana wallet connected.");
      }
      const { signature } = await provider.signAndSendTransaction(tx);
      return signature;
    },
    [],
  );

  // ── Wallet adapter for Metaplex ───────────────────────────────────────────

  const getWalletAdapter = useCallback((): MetaplexWalletAdapter | null => {
    if (!address) return null;
    const provider = getAnyProvider();
    if (!provider) return null;
    const pubkey = new PublicKey(address);
    return {
      publicKey: pubkey,
      signTransaction: async (tx: Transaction) => {
        if (provider.signTransaction) return provider.signTransaction(tx);
        // Fallback: sign via signAndSendTransaction won't work here, so throw
        throw new Error("Wallet does not support signTransaction. Please use Phantom, Solflare, or Backpack.");
      },
      signAllTransactions: async (txs: Transaction[]) => {
        if (provider.signAllTransactions) return provider.signAllTransactions(txs);
        return Promise.all(txs.map(tx => {
          if (provider.signTransaction) return provider.signTransaction(tx);
          throw new Error("Wallet does not support signAllTransactions.");
        }));
      },
    };
  }, [address]);

  // ── Context value ─────────────────────────────────────────────────────────

  const userId = address ?? anonId.current;
  const shortAddress = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : null;

  return (
    <WalletContext.Provider value={{
      connected: !!address, address, connecting, connectError,
      userId, shortAddress, privyReady: true,
      solBalance, peptomBalance, balancesLoading,
      connect, disconnect, refreshBalances, sendTransaction, getWalletAdapter,
    }}>
      {children}
      <WalletSelectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={connectWallet}
        error={connectError}
      />
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
