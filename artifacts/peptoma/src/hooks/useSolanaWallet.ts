import { useState, useCallback, useEffect } from "react";

export interface WalletState {
  connected: boolean;
  address: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  shortAddress: string | null;
}

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
      disconnect: () => Promise<void>;
      publicKey?: { toString(): string } | null;
      on: (event: string, cb: () => void) => void;
      off: (event: string, cb: () => void) => void;
    };
  }
}

export function useSolanaWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Attempt eager reconnect on mount
  useEffect(() => {
    if (!window.solana) return;
    window.solana.connect({ onlyIfTrusted: true })
      .then((resp) => setAddress(resp.publicKey.toString()))
      .catch(() => {/* not previously trusted, ignore */});

    const onDisconnect = () => setAddress(null);
    window.solana.on("disconnect", onDisconnect);
    return () => window.solana?.off("disconnect", onDisconnect);
  }, []);

  const connect = useCallback(async () => {
    if (!window.solana) {
      window.open("https://phantom.app/", "_blank");
      return;
    }
    setConnecting(true);
    try {
      const resp = await window.solana.connect();
      setAddress(resp.publicKey.toString());
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    window.solana?.disconnect();
    setAddress(null);
  }, []);

  const shortAddress = address
    ? `${address.slice(0, 4)}…${address.slice(-4)}`
    : null;

  return {
    connected: !!address,
    address,
    connecting,
    connect,
    disconnect,
    shortAddress,
  };
}
