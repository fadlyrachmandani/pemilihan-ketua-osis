-- AlterTable: rename nis -> nisn preserving data + leading zeros
ALTER TABLE "Voter" RENAME COLUMN "nis" TO "nisn";

-- Rename unique index to match new column name (Postgres keeps old name otherwise)
ALTER INDEX "Voter_nis_key" RENAME TO "Voter_nisn_key";
