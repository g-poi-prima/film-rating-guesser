-- FriendshipStatus enum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- LobbyMode enum
CREATE TYPE "LobbyMode" AS ENUM ('ALL_VS_ALL', 'TOURNAMENT');

-- FriendRequest table
CREATE TABLE "FriendRequest" (
  "id"         SERIAL PRIMARY KEY,
  "senderId"   INTEGER NOT NULL,
  "receiverId" INTEGER NOT NULL,
  "status"     "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FriendRequest_senderId_fkey"   FOREIGN KEY ("senderId")   REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FriendRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FriendRequest_senderId_receiverId_key" UNIQUE ("senderId", "receiverId")
);

-- CustomMatch table
CREATE TABLE "CustomMatch" (
  "id"          SERIAL PRIMARY KEY,
  "code"        TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "mode"        "LobbyMode" NOT NULL,
  "hostId"      INTEGER NOT NULL,
  "totalRounds" INTEGER NOT NULL DEFAULT 5,
  "status"      "MatchStatus" NOT NULL DEFAULT 'WAITING',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt"     TIMESTAMP(3),
  CONSTRAINT "CustomMatch_code_key"    UNIQUE ("code"),
  CONSTRAINT "CustomMatch_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CustomMatchResult table
CREATE TABLE "CustomMatchResult" (
  "id"            SERIAL PRIMARY KEY,
  "customMatchId" INTEGER NOT NULL,
  "userId"        INTEGER NOT NULL,
  "totalScore"    INTEGER NOT NULL DEFAULT 0,
  "rank"          INTEGER NOT NULL,
  CONSTRAINT "CustomMatchResult_customMatchId_fkey" FOREIGN KEY ("customMatchId") REFERENCES "CustomMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomMatchResult_userId_fkey"        FOREIGN KEY ("userId")        REFERENCES "User"("id")        ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomMatchResult_customMatchId_userId_key" UNIQUE ("customMatchId", "userId")
);
