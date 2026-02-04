/*
  Warnings:

  - You are about to alter the column `title` on the `categories` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(15)`.

*/
-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "title" SET DATA TYPE VARCHAR(15);
