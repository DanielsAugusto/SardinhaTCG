-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "isSale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unitCost" DECIMAL(10,2),
ADD COLUMN     "unitPrice" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "StockMovement_isSale_createdAt_idx" ON "StockMovement"("isSale", "createdAt");
