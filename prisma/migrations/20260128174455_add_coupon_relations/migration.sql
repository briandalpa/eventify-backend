-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "coupon_id" TEXT;

-- CreateIndex
CREATE INDEX "transactions_coupon_id_idx" ON "transactions"("coupon_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
