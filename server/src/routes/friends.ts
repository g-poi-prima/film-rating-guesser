import { Router } from "express";
import prisma from "@/lib/prisma";
import { authenticate } from "@/middleware/auth";
import type { AuthRequest } from "@/middleware/auth";

const router = Router();
router.use(authenticate);

const friendSelect = { id: true, username: true, avatar: true } as const;

// GET /api/friends – list accepted friends
router.get("/", async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  const requests = await prisma.friendRequest.findMany({
    where: { status: "ACCEPTED", OR: [{ senderId: userId }, { receiverId: userId }] },
    include: { sender: { select: friendSelect }, receiver: { select: friendSelect } },
  });

  const friends = requests.map((r) => (r.senderId === userId ? r.receiver : r.sender));
  res.json(friends);
});

// GET /api/friends/requests – pending requests I received
router.get("/requests", async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  const requests = await prisma.friendRequest.findMany({
    where: { receiverId: userId, status: "PENDING" },
    include: { sender: { select: friendSelect } },
    orderBy: { createdAt: "desc" },
  });
  res.json(requests);
});

// GET /api/friends/status/:userId – relationship with another user
router.get("/status/:userId", async (req: AuthRequest, res) => {
  const myId = req.user!.id;
  const otherId = parseInt(req.params.userId!);

  const req_ = await prisma.friendRequest.findFirst({
    where: { OR: [{ senderId: myId, receiverId: otherId }, { senderId: otherId, receiverId: myId }] },
  });

  if (!req_) { res.json({ status: null }); return; }
  if (req_.status === "ACCEPTED") { res.json({ status: "friends", requestId: req_.id }); return; }
  if (req_.senderId === myId) { res.json({ status: "request_sent", requestId: req_.id }); return; }
  res.json({ status: "request_received", requestId: req_.id });
});

// POST /api/friends/request – send friend request
router.post("/request", async (req: AuthRequest, res) => {
  const senderId = req.user!.id;
  const { receiverId } = req.body as { receiverId: number };

  if (!receiverId || senderId === receiverId) {
    res.status(400).json({ error: "ID non valido" });
    return;
  }

  const existing = await prisma.friendRequest.findFirst({
    where: { OR: [{ senderId, receiverId }, { senderId: receiverId, receiverId: senderId }] },
  });
  if (existing) {
    res.status(400).json({ error: existing.status === "ACCEPTED" ? "Siete già amici" : "Richiesta già inviata" });
    return;
  }

  const request = await prisma.friendRequest.create({
    data: { senderId, receiverId },
    include: { receiver: { select: friendSelect } },
  });
  res.json(request);
});

// PUT /api/friends/:id/accept – accept a pending request
router.put("/:id/accept", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const id = parseInt(req.params.id!);

  const request = await prisma.friendRequest.findUnique({ where: { id } });
  if (!request || request.receiverId !== userId) {
    res.status(404).json({ error: "Richiesta non trovata" });
    return;
  }

  const updated = await prisma.friendRequest.update({
    where: { id },
    data: { status: "ACCEPTED" },
  });
  res.json(updated);
});

// DELETE /api/friends/:id – reject or remove
router.delete("/:id", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const id = parseInt(req.params.id!);

  const request = await prisma.friendRequest.findUnique({ where: { id } });
  if (!request || (request.senderId !== userId && request.receiverId !== userId)) {
    res.status(404).json({ error: "Non trovato" });
    return;
  }

  await prisma.friendRequest.delete({ where: { id } });
  res.json({ message: "Rimosso" });
});

export default router;
