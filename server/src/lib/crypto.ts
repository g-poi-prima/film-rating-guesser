import crypto from "node:crypto";

// ── RSA-2048 key pair (generated once on startup) ─────────────────────────────

let _privateKey: string | null = null;
let _publicKey: string | null = null;

function ensureKeys(): void {
  if (_privateKey) return;
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  _privateKey = privateKey;
  _publicKey = publicKey;
  console.log("[crypto] RSA-2048 key pair generated");
}

export function getPublicKeyPem(): string {
  ensureKeys();
  return _publicKey!;
}

/** Decrypt an RSA-OAEP+SHA-256 encrypted blob (base64) → raw Buffer */
export function rsaDecrypt(encryptedBase64: string): Buffer {
  ensureKeys();
  return crypto.privateDecrypt(
    {
      key: _privateKey!,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encryptedBase64, "base64")
  );
}

// ── AES-256-GCM helpers ───────────────────────────────────────────────────────

export interface EncryptedEnvelope {
  iv: string;   // base64, 12 bytes
  tag: string;  // base64, 16 bytes
  data: string; // base64 ciphertext
}

export function aesEncrypt(plaintext: string, key: Buffer): EncryptedEnvelope {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function aesDecrypt(envelope: EncryptedEnvelope, key: Buffer): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(envelope.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

// ── Session store: sessionId → AES key ───────────────────────────────────────

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const sessions = new Map<string, { key: Buffer; timer: ReturnType<typeof setTimeout> }>();

export function createSession(aesKey: Buffer): string {
  const sessionId = crypto.randomUUID();
  const timer = setTimeout(() => sessions.delete(sessionId), SESSION_TTL_MS);
  sessions.set(sessionId, { key: aesKey, timer });
  return sessionId;
}

export function getSessionKey(sessionId: string): Buffer | undefined {
  return sessions.get(sessionId)?.key;
}

export function deleteSession(sessionId: string): void {
  const entry = sessions.get(sessionId);
  if (entry) {
    clearTimeout(entry.timer);
    sessions.delete(sessionId);
  }
}
