/*
  Warnings:

  - Added the required column `place_name` to the `rooms` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "place_name" VARCHAR(255) NOT NULL,
ADD COLUMN     "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "y" DOUBLE PRECISION NOT NULL DEFAULT 0;
