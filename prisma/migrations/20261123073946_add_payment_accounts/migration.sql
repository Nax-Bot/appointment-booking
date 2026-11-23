/*
  Warnings:

  - A unique constraint covering the columns `[reference]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `payments` ADD COLUMN `expires_at` DATETIME(3) NULL,
    ADD COLUMN `fee_amount` DECIMAL(10, 2) NULL,
    ADD COLUMN `notification_token` VARCHAR(255) NULL,
    ADD COLUMN `payment_account_id` INTEGER NULL,
    ADD COLUMN `payment_url` VARCHAR(500) NULL,
    ADD COLUMN `provider` VARCHAR(20) NULL,
    ADD COLUMN `reference` VARCHAR(100) NULL,
    MODIFY `payment_method` ENUM('CARD', 'CASH', 'MOBILE_MONEY') NULL;

-- CreateTable
CREATE TABLE `payment_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `boutique_code` VARCHAR(50) NOT NULL,
    `api_key_enc` TEXT NOT NULL,
    `webhook_secret_enc` TEXT NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `retired_at` DATETIME(3) NULL,
    `professional_id` INTEGER NOT NULL,

    INDEX `payment_accounts_professional_id_status_idx`(`professional_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `payments_reference_key` ON `payments`(`reference`);

-- CreateIndex
CREATE INDEX `payments_payment_account_id_idx` ON `payments`(`payment_account_id`);

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_payment_account_id_fkey` FOREIGN KEY (`payment_account_id`) REFERENCES `payment_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_accounts` ADD CONSTRAINT `payment_accounts_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
