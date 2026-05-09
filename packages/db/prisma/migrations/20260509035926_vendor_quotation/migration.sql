-- CreateTable
CREATE TABLE `vendors` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `tax_id` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `rating` DECIMAL(3, 2) NULL,
    `notes` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `vendors_school_id_active_idx`(`school_id`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_quotations` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `purchase_request_id` VARCHAR(191) NOT NULL,
    `vendor_id` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'REVIEWING', 'SELECTED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'DRAFT',
    `shipping_fee` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `submitted_at` DATETIME(3) NULL,
    `valid_until` DATETIME(3) NULL,
    `selected_at` DATETIME(3) NULL,
    `selected_by_id` VARCHAR(191) NULL,
    `selection_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `vendor_quotations_school_id_purchase_request_id_idx`(`school_id`, `purchase_request_id`),
    INDEX `vendor_quotations_vendor_id_idx`(`vendor_id`),
    INDEX `vendor_quotations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_items` (
    `id` VARCHAR(191) NOT NULL,
    `quotation_id` VARCHAR(191) NOT NULL,
    `purchase_request_item_id` VARCHAR(191) NOT NULL,
    `unit_price` DECIMAL(15, 2) NOT NULL,
    `quantity` DECIMAL(12, 2) NULL,
    `spec_match` ENUM('FULL', 'PARTIAL', 'MISMATCH', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `spec_match_detail` TEXT NULL,
    `notes` TEXT NULL,

    INDEX `quotation_items_purchase_request_item_id_idx`(`purchase_request_item_id`),
    UNIQUE INDEX `quotation_items_quotation_id_purchase_request_item_id_key`(`quotation_id`, `purchase_request_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `price_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `vendor_id` VARCHAR(191) NULL,
    `item_name` VARCHAR(191) NOT NULL,
    `unit_price` DECIMAL(15, 2) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `observed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `raw_data` JSON NULL,

    INDEX `price_snapshots_school_id_item_name_idx`(`school_id`, `item_name`),
    INDEX `price_snapshots_vendor_id_observed_at_idx`(`vendor_id`, `observed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_quotations` ADD CONSTRAINT `vendor_quotations_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_quotations` ADD CONSTRAINT `vendor_quotations_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `vendor_quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_purchase_request_item_id_fkey` FOREIGN KEY (`purchase_request_item_id`) REFERENCES `purchase_request_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_snapshots` ADD CONSTRAINT `price_snapshots_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
