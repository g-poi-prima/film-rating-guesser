import type { Request, Response, NextFunction } from "express";
import { getSessionKey, aesDecrypt, aesEncrypt, type EncryptedEnvelope } from "@/lib/crypto";

// Extend Request to carry the session key for the response interceptor
export interface EncryptedRequest extends Request {
  _encKey?: Buffer;
}

/**
 * Decrypts the request body when the client sends an encrypted envelope.
 * Expects: X-Session-Id header + body { iv, tag, data }
 * Replaces req.body with the decrypted JSON object.
 */
export function decryptBody(req: EncryptedRequest, res: Response, next: NextFunction): void {
  const sessionId = req.headers["x-session-id"] as string | undefined;

  // Skip: no session, no body, GET/DELETE, or body not an encrypted envelope
  if (!sessionId || !req.body || typeof req.body !== "object" || !req.body.iv) {
    next();
    return;
  }

  const key = getSessionKey(sessionId);
  if (!key) {
    res.status(401).json({ error: "Sessione crittografica non valida o scaduta" });
    return;
  }

  try {
    const envelope = req.body as EncryptedEnvelope;
    const plaintext = aesDecrypt(envelope, key);
    req.body = JSON.parse(plaintext);
    req._encKey = key; // pass to encryptResponse
    next();
  } catch {
    res.status(400).json({ error: "Decifratura del payload fallita" });
  }
}

/**
 * Wraps res.json so that responses are encrypted with the same AES session key.
 * Only activates when the request carried a valid X-Session-Id.
 */
export function encryptResponse(req: EncryptedRequest, res: Response, next: NextFunction): void {
  const sessionId = req.headers["x-session-id"] as string | undefined;
  if (!sessionId) { next(); return; }

  const key = getSessionKey(sessionId);
  if (!key) { next(); return; }

  const _json = res.json.bind(res);
  res.json = (body: unknown) => {
    const envelope = aesEncrypt(JSON.stringify(body), key);
    return _json({ encrypted: true, ...envelope });
  };

  next();
}
