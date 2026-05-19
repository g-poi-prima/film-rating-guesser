-- Drop columns removed from Match
ALTER TABLE "Match" DROP COLUMN IF EXISTS "movieId";
ALTER TABLE "Match" DROP COLUMN IF EXISTS "movieTitle";
ALTER TABLE "Match" DROP COLUMN IF EXISTS "moviePoster";
ALTER TABLE "Match" DROP COLUMN IF EXISTS "movieOverview";
ALTER TABLE "Match" DROP COLUMN IF EXISTS "realRating";
ALTER TABLE "Match" DROP COLUMN IF EXISTS "player1Rating";
ALTER TABLE "Match" DROP COLUMN IF EXISTS "player2Rating";

-- Add totalRounds to Match
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "totalRounds" INTEGER NOT NULL DEFAULT 5;

-- Create MatchRound table
CREATE TABLE IF NOT EXISTS "MatchRound" (
    "id"            SERIAL PRIMARY KEY,
    "matchId"       INTEGER NOT NULL,
    "roundNumber"   INTEGER NOT NULL,
    "movieId"       INTEGER NOT NULL,
    "movieTitle"    TEXT NOT NULL,
    "moviePoster"   TEXT,
    "movieOverview" TEXT,
    "realRating"    DOUBLE PRECISION NOT NULL,
    "player1Rating" DOUBLE PRECISION,
    "player2Rating" DOUBLE PRECISION,
    "player1Score"  INTEGER,
    "player2Score"  INTEGER,
    CONSTRAINT "MatchRound_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
