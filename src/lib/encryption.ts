import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("APP_SECRET not set");
  // Use first 32 bytes of the secret as encryption key
  return Buffer.from(secret.slice(0, 32).padEnd(32, "0"), "utf8");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  // Format: iv:tag:ciphertext
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

export function decrypt(encoded: string): string {
  const key = getKey();
  const [ivHex, tagHex, ciphertext] = encoded.split(":");
  if (!ivHex || !tagHex || !ciphertext) throw new Error("Invalid encrypted format");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
