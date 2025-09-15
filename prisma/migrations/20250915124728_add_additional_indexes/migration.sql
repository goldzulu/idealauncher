-- CreateIndex
CREATE INDEX "ChatMessage_ideaId_role_createdAt_idx" ON "ChatMessage"("ideaId", "role", "createdAt");

-- CreateIndex
CREATE INDEX "Idea_ownerId_riceScore_idx" ON "Idea"("ownerId", "riceScore");

-- CreateIndex
CREATE INDEX "Idea_ownerId_phase_idx" ON "Idea"("ownerId", "phase");

-- CreateIndex
CREATE INDEX "Idea_ownerId_isArchived_updatedAt_idx" ON "Idea"("ownerId", "isArchived", "updatedAt");
