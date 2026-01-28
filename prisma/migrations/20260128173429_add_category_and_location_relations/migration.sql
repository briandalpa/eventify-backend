/*
  Warnings:

  - You are about to drop the column `category` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `events` table. All the data in the column will be lost.
  - Changed the type of `value` on the `categories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `category_id` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location_id` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "events_category_idx";

-- DropIndex
DROP INDEX "events_location_idx";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "value",
ADD COLUMN     "value" "EventCategory" NOT NULL;

-- AlterTable
ALTER TABLE "events" DROP COLUMN "category",
DROP COLUMN "location",
ADD COLUMN     "category_id" TEXT NOT NULL,
ADD COLUMN     "location_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "categories_value_key" ON "categories"("value");

-- CreateIndex
CREATE INDEX "events_category_id_idx" ON "events"("category_id");

-- CreateIndex
CREATE INDEX "events_location_id_idx" ON "events"("location_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
