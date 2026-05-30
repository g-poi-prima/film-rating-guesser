// Client-side encryption — Web Crypto API (AES-256-GCM + RSA-OAEP)

export interface EncryptedEnvelope {
  iv: string;   // base64, 12 bytes
  tag: string;  // base64, 16 bytes
  data: string; // base64 ciphertext
}

// ── Module state ──────────────────────────────────────────────────────────────

let _aesKey: CryptoKey | null = null;
let _sessionId: string | null = null;
let _initPromise: Promise<void> | null = null;

// ── Utilities ─────────────────────────────────────────────────────────────────

function b64Encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64Decode(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

function pemToBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  return b64Decode(b64).buffer;
}

// ── Initialisation ────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  // 1. Fetch server RSA public key
  const keyRes = await fetch("/api/crypto/public-key");
  if (!keyRes.ok) throw new Error("Impossibile ottenere la chiave pubblica del server");
  const { publicKey: pem } = (await keyRes.json()) as { publicKey: string };

  const rsaPublicKey = await crypto.subtle.importKey(
    "spki",
    pemToBuffer(pem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  // 2. Generate AES-256-GCM session key
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const aesRaw = await crypto.subtle.exportKey("raw", aesKey);

  // 3. Encrypt AES key with server RSA public key
  const encryptedAes = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaPublicKey,
    aesRaw
  );

  // 4. Register session on server
  const sessionRes = await fetch("/api/crypto/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ encryptedKey: b64Encode(encryptedAes) }),
  });
  if (!sessionRes.ok) throw new Error("Handshake crittografico fallito");
  const { sessionId } = (await sessionRes.json()) as { sessionId: string };

  _aesKey = aesKey;
  _sessionId = sessionId;
}

/** Ensures crypto is initialised (idempotent, concurrent-safe). */
export function ensureInit(): Promise<void> {
  if (!_initPromise) _initPromise = init();
  return _initPromise;
}

export function getSessionId(): string | null {
  return _sessionId;
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

/**
 * Encrypts any JSON-serialisable value.
 * Returns an envelope ready to be sent as a request body.
 */
export async function encryptPayload(value: unknown): Promise<EncryptedEnvelope> {
  await ensureInit();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));

  // AES-GCM output = ciphertext || 16-byte auth tag
  const raw = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, _aesKey!, encoded)
  );

  return {
    iv: b64Encode(iv.buffer),
    tag: b64Encode(raw.slice(-16).buffer),
    data: b64Encode(raw.slice(0, -16).buffer),
  };
}

/**
 * Decrypts a server response envelope.
 * Returns the original parsed JSON value.
 */
export async function decryptPayload(envelope: EncryptedEnvelope): Promise<unknown> {
  await ensureInit();
  const iv = b64Decode(envelope.iv);
  const ciphertext = b64Decode(envelope.data);
  const tag = b64Decode(envelope.tag);

  // Web Crypto expects ciphertext || tag concatenated
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    _aesKey!,
    combined
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}
