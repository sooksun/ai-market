-- CreateTable
CREATE TABLE `approval_workflows` (
    `id` VARCHAR(191) NOT NULL,
    `school_id` VARCHAR(191) NOT NULL,
    `purchase_request_id` VARCHAR(191) NOT NULL,
    `template` VARCHAR(191) NULL,
    `current_step` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `approval_workflows_purchase_request_id_key`(`purchase_request_id`),
    INDEX `approval_workflows_school_id_status_idx`(`school_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval_steps` (
    `id` VARCHAR(191) NOT NULL,
    `workflow_id` VARCHAR(191) NOT NULL,
    `ordinal` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `approver_role` ENUM('REQUESTER', 'PROJECT_OWNER', 'PROCUREMENT', 'FINANCE', 'INSPECTOR', 'DIRECTOR', 'AUDITOR', 'ADMIN') NULL,
    `approver_id` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `comment` TEXT NULL,
    `decided_by_id` VARCHAR(191) NULL,
    `decided_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `approval_steps_workflow_id_idx`(`workflow_id`),
    INDEX `approval_steps_approver_role_status_idx`(`approver_role`, `status`),
    UNIQUE INDEX `approval_steps_workflow_id_ordinal_key`(`workflow_id`, `ordinal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `approval_workflows` ADD CONSTRAINT `approval_workflows_purchase_request_id_fkey` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_steps` ADD CONSTRAINT `approval_steps_workflow_id_fkey` FOREIGN KEY (`workflow_id`) REFERENCES `approval_workflows`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
