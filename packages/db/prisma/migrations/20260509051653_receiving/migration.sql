-- CreateTable
CREATE TABLE `receiving_records` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `purchase_request_id` VARCHAR(191) NOT NULL,
    `status` ENUM('IN_PROGRESS', 'COMPLETE', 'PARTIAL', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finalized_at` DATETIME(3) NULL,
    `finalized_by_id` VARCHAR(191) NULL,
    `comment` TEXT NULL,
    `inspector_ids` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `receiving_records_purchase_request_id_key`(`purchase_request_id`),
    INDEX `receiving_records_school_id_status_idx`(`school_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receiving_items` (
    `id` VARCHAR(191) NOT NULL,
    `receiving_record_id` VARCHAR(191) NOT NULL,
    `purchase_request_item_id` VARCHAR(191) NOT NULL,
    `quantity_received` DECIMAL(12, 2) NULL,
    `condition` ENUM('GOOD', 'DAMAGED', 'WRONG_SPEC', 'SHORT_QUANTITY', 'NOT_RECEIVED') NULL DEFAULT 'GOOD',
    `condition_notes` TEXT NULL,
    `inspected_at` DATETIME(3) NULL,
    `inspected_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `receiving_items_purchase_request_item_id_idx`(`purchase_request_item_id`),
    UNIQUE INDEX `receiving_items_receiving_record_id_purchase_request_item_id_key`(`receiving_record_id`, `purchase_request_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `receiving_records` ADD CONSTRAINT `receiving_records_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_items` ADD CONSTRAINT `receiving_items_receiving_record_id_fkey` FOREIGN KEY (`receiving_record_id`) REFERENCES `receiving_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_items` ADD CONSTRAINT `receiving_items_purchase_request_item_id_fkey` FOREIGN KEY (`purchase_request_item_id`) REFERENCES `purchase_request_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
