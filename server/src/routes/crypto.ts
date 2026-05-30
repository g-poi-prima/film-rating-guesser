import { Router } from "express";
import { getPublicKeyPem, rsaDecrypt, createSession } from "@/lib/crypto";

const router = Router();

/**
 * GET /api/crypto/public-key
 * Returns the server's RSA-2048 public key (PEM) so the client can encrypt its AES session key.
 */
router.get("/public-key", (_req, res) => {
  res.json({ publicKey: getPublicKeyPem() });
});

/**
 * POST /api/crypto/session
 * Body: { encryptedKey: string }  — AES-256 key (32 bytes) encrypted with the server's RSA public key, base64.
 * Returns: { sessionId: string }
 */
router.post("/session", (req, res) => {
  const { encryptedKey } = req.body as { encryptedKey?: string };
  if (!encryptedKey) {
    res.status(400).json({ error: "encryptedKey required" });
    return;
  }
  try {
    const aesKey = rsaDecrypt(encryptedKey);
    if (aesKey.length !== 32) {
      res.status(400).json({ error: "Invalid AES key length (expected 256 bit)" });
      return;
    }
    const sessionId = createSession(aesKey);
    res.status(201).json({ sessionId });
  } catch {
    res.status(400).json({ error: "Key decryption failed" });
  }
});

export default router;
