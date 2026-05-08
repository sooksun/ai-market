-- CreateTable
CREATE TABLE `schools` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `short_name` VARCHAR(191) NULL,
    `tax_id` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `fiscal_year` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `projects_school_id_active_idx`(`school_id`, `active`),
    UNIQUE INDEX `projects_school_id_fiscal_year_code_key`(`school_id`, `fiscal_year`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_sources` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `fiscal_year` INTEGER NOT NULL,
    `total_amount` DECIMAL(15, 2) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `budget_sources_school_id_active_idx`(`school_id`, `active`),
    UNIQUE INDEX `budget_sources_school_id_fiscal_year_code_key`(`school_id`, `fiscal_year`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_school_id_idx`(`school_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `role` ENUM('REQUESTER', 'PROJECT_OWNER', 'PROCUREMENT', 'FINANCE', 'INSPECTOR', 'DIRECTOR', 'AUDITOR', 'ADMIN') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_roles_user_id_role_key`(`user_id`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `ip` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_school_id_entity_type_entity_id_idx`(`school_id`, `entity_type`, `entity_id`),
    INDEX `audit_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `audit_logs_action_created_at_idx`(`action`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rule_configs` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `updated_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rule_configs_school_id_key_key`(`school_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_invocations` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `prompt_version` VARCHAR(191) NOT NULL,
    `input` JSON NOT NULL,
    `output` JSON NULL,
    `token_input` INTEGER NULL,
    `token_output` INTEGER NULL,
    `latency_ms` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_invocations_endpoint_created_at_idx`(`endpoint`, `created_at`),
    INDEX `ai_invocations_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_requests` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `doc_no` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'REVIEWING', 'RETURNED', 'APPROVED_FOR_COMPARISON', 'IN_COMPARISON', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_RECEIVING', 'RECEIVED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `requester_id` VARCHAR(191) NOT NULL,
    `total_amount` DECIMAL(15, 2) NULL,
    `project_id` VARCHAR(191) NULL,
    `budget_source_id` VARCHAR(191) NULL,
    `submitted_at` DATETIME(3) NULL,
    `approved_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `purchase_requests_school_id_status_created_at_idx`(`school_id`, `status`, `created_at`),
    INDEX `purchase_requests_requester_id_created_at_idx`(`requester_id`, `created_at`),
    INDEX `purchase_requests_project_id_idx`(`project_id`),
    INDEX `purchase_requests_budget_source_id_idx`(`budget_source_id`),
    UNIQUE INDEX `purchase_requests_school_id_doc_no_key`(`school_id`, `doc_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_request_items` (
    `id` VARCHAR(191) NOT NULL,
    `purchase_request_id` VARCHAR(191) NOT NULL,
    `ordinal` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `unit_price_est` DECIMAL(15, 2) NULL,
    `raw_text` TEXT NULL,
    `parsed_by_ai` BOOLEAN NOT NULL DEFAULT false,
    `classified_type` ENUM('MATERIAL', 'ASSET', 'SERVICE', 'UNCLASSIFIED') NOT NULL DEFAULT 'UNCLASSIFIED',
    `classified_by_ai` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `purchase_request_items_purchase_request_id_idx`(`purchase_request_id`),
    UNIQUE INDEX `purchase_request_items_purchase_request_id_ordinal_key`(`purchase_request_id`, `ordinal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_specifications` (
    `id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `level` ENUM('MUST_HAVE', 'NICE_TO_HAVE', 'INFO') NOT NULL DEFAULT 'MUST_HAVE',
    `source` ENUM('HUMAN', 'AI') NOT NULL DEFAULT 'HUMAN',
    `ordinal` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `item_specifications_item_id_idx`(`item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_risk_flags` (
    `id` VARCHAR(191) NOT NULL,
    `purchase_request_id` VARCHAR(191) NULL,
    `item_id` VARCHAR(191) NULL,
    `type` ENUM('AMBIGUOUS_SPEC', 'BRAND_LOCK', 'PRICE_OUTLIER', 'INSUFFICIENT_QUOTES', 'MISSING_DOC', 'BUDGET_OVERRUN', 'REASON_MISSING', 'CLASSIFICATION_UNCERTAIN', 'OTHER') NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    `message` TEXT NOT NULL,
    `detail` JSON NULL,
    `model_version` VARCHAR(191) NULL,
    `invocation_id` VARCHAR(191) NULL,
    `dismissed_by_id` VARCHAR(191) NULL,
    `dismissed_at` DATETIME(3) NULL,
    `dismissed_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_risk_flags_purchase_request_id_idx`(`purchase_request_id`),
    INDEX `ai_risk_flags_item_id_idx`(`item_id`),
    INDEX `ai_risk_flags_type_severity_idx`(`type`, `severity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attachments` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `owner_type` VARCHAR(191) NOT NULL,
    `owner_id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `storage_path` VARCHAR(191) NOT NULL,
    `uploaded_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attachments_school_id_owner_type_owner_id_idx`(`school_id`, `owner_type`, `owner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_sources` ADD CONSTRAINT `budget_sources_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rule_configs` ADD CONSTRAINT `rule_configs_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rule_configs` ADD CONSTRAINT `rule_configs_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_requester_id_fkey` FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_budget_source_id_fkey` FOREIGN KEY (`budget_source_id`) REFERENCES `budget_sources`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_specifications` ADD CONSTRAINT `item_specifications_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `purchase_request_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_risk_flags` ADD CONSTRAINT `ai_risk_flags_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_risk_flags` ADD CONSTRAINT `ai_risk_flags_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `purchase_request_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
