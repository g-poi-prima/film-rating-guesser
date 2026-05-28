// Shared in-memory lobby store – imported by both socket.ts and the REST route.

export type FilmMode = "popular" | "any";

export interface LobbyPlayer {
  userId: number;
  username: string;
  totalScore: number;
  eliminated: boolean;
  submittedRating: number | null;
}

export interface LobbyRoom {
  code: string;
  name: string;
  mode: "ALL_VS_ALL" | "TOURNAMENT";
  filmMode: FilmMode;
  hostId: number;
  players: Map<number, LobbyPlayer>;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  currentRound: number;
  totalRounds: number;
  movie: { id: number; title: string; overview: string; poster: string | null } | null;
  realRating: number;
  dbMatchId: number | null;
}

export const lobbies = new Map<string, LobbyRoom>();

export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return lobbies.has(code) ? generateCode() : code;
}

export function lobbyToPublic(room: LobbyRoom) {
  return {
    code: room.code,
    name: room.name,
    mode: room.mode,
    filmMode: room.filmMode,
    hostId: room.hostId,
    playerCount: room.players.size,
    players: Array.from(room.players.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      totalScore: p.totalScore,
      eliminated: p.eliminated,
    })),
    status: room.status,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
  };
}
