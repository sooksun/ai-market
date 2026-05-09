-- AlterTable
ALTER TABLE `ai_risk_flags` ADD COLUMN `audit_scan_id` VARCHAR(191) NULL,
    MODIFY `type` ENUM('AMBIGUOUS_SPEC', 'BRAND_LOCK', 'PRICE_OUTLIER', 'INSUFFICIENT_QUOTES', 'MISSING_DOC', 'BUDGET_OVERRUN', 'REASON_MISSING', 'CLASSIFICATION_UNCERTAIN', 'VENDOR_CONCENTRATION', 'NEAR_THRESHOLD_SPLIT', 'OTHER') NOT NULL;

-- CreateTable
CREATE TABLE `audit_scans` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `ran_by_id` VARCHAR(191) NOT NULL,
    `scope` JSON NOT NULL,
    `pr_count` INTEGER NOT NULL DEFAULT 0,
    `flag_count` INTEGER NOT NULL DEFAULT 0,
    `ai_invocation_id` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_scans_school_id_created_at_idx`(`school_id`, `created_at`),
    INDEX `audit_scans_ran_by_id_created_at_idx`(`ran_by_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ai_risk_flags_audit_scan_id_idx` ON `ai_risk_flags`(`audit_scan_id`);

-- AddForeignKey
ALTER TABLE `ai_risk_flags` ADD CONSTRAINT `ai_risk_flags_audit_scan_id_fkey` FOREIGN KEY (`audit_scan_id`) REFERENCES `audit_scans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_scans` ADD CONSTRAINT `audit_scans_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_scans` ADD CONSTRAINT `audit_scans_ran_by_id_fkey` FOREIGN KEY (`ran_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
