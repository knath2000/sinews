// AES-256-GCM token encryption/decryption using jose v6
import { CompactEncrypt } from "jose/jwe/compact/encrypt";
import { compactDecrypt } from "jose/jwe/compact/decrypt";

const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

/**
 * Derives a 256-bit key from ACCOUNT_TOKEN_ENCRYPTION_KEY env var.
 * The env var can be any string — it gets hashed via SHA-256 into 32 bytes.
 */
function getKeyBytes(): Uint8Array {
  const keyRaw = process.env.ACCOUNT_TOKEN_ENCRYPTION_KEY;
  if (!keyRaw) {
    throw new Error("ACCOUNT_TOKEN_ENCRYPTION_KEY is not set");
  }
  const keyMaterial = crypto.subtle.digest(
    "SHA-256",
    ENCODER.encode(keyRaw)
  );
  // synchronous helper using crypto.subtle
  // Note: subtle.digest returns a Promise, so this needs to be async
  // We'll handle this in the encrypt/decrypt functions
  throw new Error("Use getKeyBytesAsync instead");
}

async function getKeyBytesAsync(): Promise<Uint8Array> {
  const keyRaw = process.env.ACCOUNT_TOKEN_ENCRYPTION_KEY;
  if (!keyRaw) {
    throw new Error("ACCOUNT_TOKEN_ENCRYPTION_KEY is not set");
  }
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    ENCODER.encode(keyRaw)
  );
  return new Uint8Array(hashBuffer);
}

/**
 * Encrypts plaintext using AES-256-GCM and returns a compact JWE string.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKeyBytesAsync();
  const jwe = await new CompactEncrypt(new TextEncoder().encode(plaintext))
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(key);
  return jwe;
}

/**
 * Decrypts a compact JWE string using AES-256-GCM.
 */
export async function decrypt(jwe: string): Promise<string> {
  const key = await getKeyBytesAsync();
  const { plaintext } = await compactDecrypt(jwe, key);
  return DECODER.decode(plaintext);
}
