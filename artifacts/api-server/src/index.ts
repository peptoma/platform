import app from "./app";
import { logger } from "./lib/logger";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

function getTreasuryAddress(): string | null {
  const pk = process.env.TREASURY_PRIVATE_KEY;
  if (!pk) return null;
  try {
    const arr = JSON.parse(pk) as number[];
    if (Array.isArray(arr)) return Keypair.fromSecretKey(Uint8Array.from(arr)).publicKey.toString();
  } catch {}
  try { return Keypair.fromSecretKey(bs58.decode(pk)).publicKey.toString(); } catch {}
  try { return Keypair.fromSecretKey(Buffer.from(pk, "base64")).publicKey.toString(); } catch {}
  return null;
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  const treasuryAddress = getTreasuryAddress();
  logger.info({ port, treasuryAddress: treasuryAddress ?? "NOT CONFIGURED" }, "Server listening");
});
