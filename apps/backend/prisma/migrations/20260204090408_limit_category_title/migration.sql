/*
  Warnings:

  - You are about to alter the column `title` on the `categories` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(15)`.

*/
-- 사전 데이터 정리: 15자를 초과하는 title을 15자로 자르기
UPDATE "categories" 
SET "title" = SUBSTRING("title", 1, 15)
WHERE LENGTH("title") > 15;

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "title" SET DATA TYPE VARCHAR(15);
