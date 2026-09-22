-- Index untuk hitung sudah/belum memilih (dipakai summary & polling)
CREATE INDEX IF NOT EXISTS "Voter_hasVoted_idx" ON "Voter"("hasVoted");

-- Index untuk hitung suara per paslon (Vote.candidateId)
CREATE INDEX IF NOT EXISTS "Vote_candidateId_idx" ON "Vote"("candidateId");

-- Index untuk lookup NISN cepat (sudah ada unique, tapi pastikan)
-- UNIQUE INDEX "Voter_nisn_key" sudah ada dari migrasi rename
