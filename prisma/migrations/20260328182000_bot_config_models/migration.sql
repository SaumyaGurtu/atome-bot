-- Replace legacy tables with BotConfig domain models
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "KnowledgeChunk";
DROP TABLE IF EXISTS "Mistake";
DROP TABLE IF EXISTS "AgentProfile";
DROP TABLE IF EXISTS "AppConfig";
PRAGMA foreign_keys=ON;

-- CreateTable
CREATE TABLE "BotConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "knowledgeBaseUrl" TEXT NOT NULL,
    "additionalGuidelines" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botConfigId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KnowledgeChunk_botConfigId_fkey" FOREIGN KEY ("botConfigId") REFERENCES "BotConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MistakeReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botConfigId" TEXT NOT NULL,
    "userQuestion" TEXT NOT NULL,
    "botAnswer" TEXT NOT NULL,
    "userFeedback" TEXT NOT NULL,
    "correctedAnswer" TEXT,
    "problemType" TEXT,
    "fixSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MistakeReport_botConfigId_fkey" FOREIGN KEY ("botConfigId") REFERENCES "BotConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorrectionRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botConfigId" TEXT NOT NULL,
    "triggerPattern" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "correctedGuidance" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CorrectionRule_botConfigId_fkey" FOREIGN KEY ("botConfigId") REFERENCES "BotConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UploadedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botConfigId" TEXT,
    "fileName" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UploadedDocument_botConfigId_fkey" FOREIGN KEY ("botConfigId") REFERENCES "BotConfig" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "KnowledgeChunk_botConfigId_idx" ON "KnowledgeChunk"("botConfigId");

-- CreateIndex
CREATE INDEX "MistakeReport_botConfigId_idx" ON "MistakeReport"("botConfigId");

-- CreateIndex
CREATE INDEX "MistakeReport_status_idx" ON "MistakeReport"("status");

-- CreateIndex
CREATE INDEX "CorrectionRule_botConfigId_idx" ON "CorrectionRule"("botConfigId");

-- CreateIndex
CREATE INDEX "UploadedDocument_botConfigId_idx" ON "UploadedDocument"("botConfigId");
