import { Router } from "express";
import prisma from "@/lib/prisma";
import { authenticate } from "@/middleware/auth";
import { asyncHandler } from "@/middleware/asyncHandler";
import type { AuthRequest } from "@/middleware/auth";

const router = Router();
router.use(authenticate);

const friendSelect = { id: true, username: true, avatar: true } as const;

// ── Search users (for adding friends) ────────────────────────────────────────

router.get(
  "/search",
  asyncHandler(async (req: AuthRequest, res) => {
    const q = ((req.query.q as string) ?? "").trim();
    if (q.length === 0) { res.json([]); return; }

    const myId = req.user!.id;
    const isId = /^\d+$/.test(q);

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: myId } },
          isId
            ? { id: parseInt(q) }
            : {
                OR: [
                  { username: { contains: q, mode: "insensitive" } },
                  { email:    { equals:   q, mode: "insensitive" } },
                ],
              },
        ],
      },
      select: { id: true, username: true, avatar: true },
      take: 10,
    });

    res.json(users);
  })
);

// ── List accepted friends ─────────────────────────────────────────────────────

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;

    const requests = await prisma.friendRequest.findMany({
      where: { status: "ACCEPTED", OR: [{ senderId: userId }, { receiverId: userId }] },
      include: { sender: { select: friendSelect }, receiver: { select: friendSelect } },
    });

    const friends = requests.map((r) => (r.senderId === userId ? r.receiver : r.sender));
    res.json(friends);
  })
);

// ── Pending requests received ─────────────────────────────────────────────────

router.get(
  "/requests",
  asyncHandler(async (req: AuthRequest, res) => {
    const requests = await prisma.friendRequest.findMany({
      where: { receiverId: req.user!.id, status: "PENDING" },
      include: { sender: { select: friendSelect } },
      orderBy: { createdAt: "desc" },
    });
    res.json(requests);
  })
);

// ── Relationship status with another user ─────────────────────────────────────

router.get(
  "/status/:userId",
  asyncHandler(async (req: AuthRequest, res) => {
    const myId = req.user!.id;
    const otherId = parseInt(req.params.userId!);

    const request = await prisma.friendRequest.findFirst({
      where: { OR: [{ senderId: myId, receiverId: otherId }, { senderId: otherId, receiverId: myId }] },
    });

    if (!request) { res.json({ status: null }); return; }
    if (request.status === "ACCEPTED") { res.json({ status: "friends", requestId: request.id }); return; }
    if (request.senderId === myId) { res.json({ status: "request_sent", requestId: request.id }); return; }
    res.json({ status: "request_received", requestId: request.id });
  })
);

// ── Send friend request ───────────────────────────────────────────────────────

router.post(
  "/request",
  asyncHandler(async (req: AuthRequest, res) => {
    const senderId = req.user!.id;
    const { receiverId } = req.body as { receiverId?: number };

    if (!receiverId || senderId === receiverId) {
      res.status(400).json({ error: "ID non valido" });
      return;
    }

    const existing = await prisma.friendRequest.findFirst({
      where: { OR: [{ senderId, receiverId }, { senderId: receiverId, receiverId: senderId }] },
    });
    if (existing) {
      res.status(400).json({
        error: existing.status === "ACCEPTED" ? "Siete già amici" : "Richiesta già inviata",
      });
      return;
    }

    const request = await prisma.friendRequest.create({
      data: { senderId, receiverId },
      include: { receiver: { select: friendSelect } },
    });
    res.json(request);
  })
);

// ── Accept a pending request ──────────────────────────────────────────────────

router.put(
  "/:id/accept",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const id = parseInt(req.params.id!);

    const request = await prisma.friendRequest.findUnique({ where: { id } });
    if (!request || request.receiverId !== userId) {
      res.status(404).json({ error: "Richiesta non trovata" });
      return;
    }

    const updated = await prisma.friendRequest.update({ where: { id }, data: { status: "ACCEPTED" } });
    res.json(updated);
  })
);

// ── Reject or remove ──────────────────────────────────────────────────────────

router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const id = parseInt(req.params.id!);

    const request = await prisma.friendRequest.findUnique({ where: { id } });
    if (!request || (request.senderId !== userId && request.receiverId !== userId)) {
      res.status(404).json({ error: "Non trovato" });
      return;
    }

    await prisma.friendRequest.delete({ where: { id } });
    res.json({ message: "Rimosso" });
  })
);

export default router;
