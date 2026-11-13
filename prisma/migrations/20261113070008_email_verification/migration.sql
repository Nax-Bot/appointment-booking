-- AlterTable
ALTER TABLE `users` ADD COLUMN `email_verified_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `email_verifications` (
    `user_id` INTEGER NOT NULL,
    `code_hash` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `last_sent_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `email_verifications` ADD CONSTRAINT `email_verifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `users` SET `email_verified_at` = NOW(3) WHERE `email_verified_at` IS NULL;