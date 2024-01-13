/*
  Warnings:

  - You are about to drop the column `cartId` on the `CartItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "cartId";

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_id_fkey" FOREIGN KEY ("id") REFERENCES "Cart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
