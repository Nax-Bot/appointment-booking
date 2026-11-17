-- CreateTable
CREATE TABLE `rate_limits` (
    `limit_key` VARCHAR(320) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `window_start` DATETIME(3) NOT NULL,
    `blocked_until` DATETIME(3) NULL,

    INDEX `rate_limits_window_start_idx`(`window_start`),
    PRIMARY KEY (`limit_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
