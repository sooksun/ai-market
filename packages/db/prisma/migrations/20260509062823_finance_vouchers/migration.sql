-- CreateTable
CREATE TABLE `finance_vouchers` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `purchase_request_id` VARCHAR(191) NOT NULL,
    `voucher_number` VARCHAR(191) NULL,
    `total_amount` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('PENDING', 'ISSUED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `issued_at` DATETIME(3) NULL,
    `issued_by_id` VARCHAR(191) NULL,
    `paid_at` DATETIME(3) NULL,
    `paid_by_id` VARCHAR(191) NULL,
    `payment_ref` VARCHAR(191) NULL,
    `payment_method` VARCHAR(191) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `cancelled_by_id` VARCHAR(191) NULL,
    `cancel_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `finance_vouchers_purchase_request_id_key`(`purchase_request_id`),
    INDEX `finance_vouchers_school_id_status_idx`(`school_id`, `status`),
    UNIQUE INDEX `finance_vouchers_school_id_voucher_number_key`(`school_id`, `voucher_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `finance_vouchers` ADD CONSTRAINT `finance_vouchers_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
