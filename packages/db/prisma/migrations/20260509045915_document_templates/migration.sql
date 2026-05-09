-- CreateTable
CREATE TABLE `document_templates` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NULL,
    `template_key` VARCHAR(191) NOT NULL,
    `name_th` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `html_content` LONGTEXT NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updated_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `document_templates_school_id_category_idx`(`school_id`, `category`),
    UNIQUE INDEX `document_templates_school_id_template_key_key`(`school_id`, `template_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procurement_documents` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `template_id` VARCHAR(191) NOT NULL,
    `template_key` VARCHAR(191) NOT NULL,
    `template_version` INTEGER NOT NULL,
    `ref_type` VARCHAR(191) NOT NULL,
    `ref_id` VARCHAR(191) NOT NULL,
    `doc_no` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `rendered_html` LONGTEXT NOT NULL,
    `context_data` JSON NOT NULL,
    `generated_by_id` VARCHAR(191) NULL,
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `procurement_documents_school_id_ref_type_ref_id_idx`(`school_id`, `ref_type`, `ref_id`),
    INDEX `procurement_documents_template_key_generated_at_idx`(`template_key`, `generated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `procurement_documents` ADD CONSTRAINT `procurement_documents_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `document_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
