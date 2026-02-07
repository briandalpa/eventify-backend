/*
  Warnings:

  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `reset_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `reset_token_expiry` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_email_idx";

-- DropIndex
DROP INDEX "users_referral_code_idx";

-- DropIndex
DROP INDEX "users_reset_token_key";

-- DropIndex
DROP INDEX "users_token_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password",
DROP COLUMN "reset_token",
DROP COLUMN "reset_token_expiry",
DROP COLUMN "token",
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "referral_code" DROP NOT NULL;
