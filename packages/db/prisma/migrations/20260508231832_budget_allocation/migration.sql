-- CreateTable
CREATE TABLE `budgets` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `budget_source_id` VARCHAR(191) NOT NULL,
    `fiscal_year` INTEGER NOT NULL,
    `allocated` DECIMAL(15, 2) NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `budgets_school_id_fiscal_year_idx`(`school_id`, `fiscal_year`),
    INDEX `budgets_project_id_idx`(`project_id`),
    UNIQUE INDEX `budgets_school_id_fiscal_year_project_id_budget_source_id_key`(`school_id`, `fiscal_year`, `project_id`, `budget_source_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_movements` (
    `id` VARCHAR(191) NOT NULL,
    `budget_id` VARCHAR(191) NOT NULL,
    `type` ENUM('ALLOCATE', 'HOLD', 'RELEASE', 'COMMIT', 'SPEND', 'ADJUST') NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `ref_type` VARCHAR(191) NULL,
    `ref_id` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `created_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `budget_movements_budget_id_created_at_idx`(`budget_id`, `created_at`),
    INDEX `budget_movements_ref_type_ref_id_idx`(`ref_type`, `ref_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_budget_source_id_fkey` FOREIGN KEY (`budget_source_id`) REFERENCES `budget_sources`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_movements` ADD CONSTRAINT `budget_movements_budget_id_fkey` FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
