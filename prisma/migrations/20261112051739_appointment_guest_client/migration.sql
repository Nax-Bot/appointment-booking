-- AlterTable
ALTER TABLE `appointments` ADD COLUMN `guest_name` VARCHAR(150) NULL,
    ADD COLUMN `guest_phone` VARCHAR(30) NULL,
    MODIFY `client_id` INTEGER NULL;
