-- CreateTable
CREATE TABLE `inventory_items` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `current_qty` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `reorder_point` DECIMAL(15, 2) NULL,
    `notes` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `inventory_items_school_id_active_idx`(`school_id`, `active`),
    UNIQUE INDEX `inventory_items_school_id_name_unit_key`(`school_id`, `name`, `unit`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `inventory_item_id` VARCHAR(191) NOT NULL,
    `type` ENUM('IN', 'OUT', 'ADJUST', 'WRITE_OFF') NOT NULL,
    `quantity` DECIMAL(15, 2) NOT NULL,
    `ref_type` VARCHAR(191) NULL,
    `ref_id` VARCHAR(191) NULL,
    `unit_cost` DECIMAL(15, 2) NULL,
    `notes` TEXT NULL,
    `created_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_movements_inventory_item_id_created_at_idx`(`inventory_item_id`, `created_at`),
    INDEX `stock_movements_ref_type_ref_id_idx`(`ref_type`, `ref_id`),
    INDEX `stock_movements_school_id_created_at_idx`(`school_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_registers` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `asset_number` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `acquisition_cost` DECIMAL(15, 2) NOT NULL,
    `acquisition_date` DATETIME(3) NOT NULL,
    `serial_number` VARCHAR(191) NULL,
    `vendor_name` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `custodian_id` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'STORED', 'REPAIR', 'DISPOSED') NOT NULL DEFAULT 'ACTIVE',
    `qr_code` VARCHAR(191) NULL,
    `purchase_request_id` VARCHAR(191) NULL,
    `receiving_item_id` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `asset_registers_qr_code_key`(`qr_code`),
    INDEX `asset_registers_school_id_status_idx`(`school_id`, `status`),
    INDEX `asset_registers_category_idx`(`category`),
    INDEX `asset_registers_purchase_request_id_idx`(`purchase_request_id`),
    UNIQUE INDEX `asset_registers_school_id_asset_number_key`(`school_id`, `asset_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_inventory_item_id_fkey` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
