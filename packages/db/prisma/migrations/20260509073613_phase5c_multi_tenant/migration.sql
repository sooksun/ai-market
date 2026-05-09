-- AlterTable
ALTER TABLE `approval_steps` MODIFY `approver_role` ENUM('REQUESTER', 'PROJECT_OWNER', 'PROCUREMENT', 'FINANCE', 'INSPECTOR', 'DIRECTOR', 'AUDITOR', 'ADMIN', 'SUPERADMIN') NULL;

-- AlterTable
ALTER TABLE `schools` ADD COLUMN `area_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user_roles` MODIFY `role` ENUM('REQUESTER', 'PROJECT_OWNER', 'PROCUREMENT', 'FINANCE', 'INSPECTOR', 'DIRECTOR', 'AUDITOR', 'ADMIN', 'SUPERADMIN') NOT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `tenant_access` JSON NULL;

-- CreateTable
CREATE TABLE `areas` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `region` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `areas_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `schools_area_id_active_idx` ON `schools`(`area_id`, `active`);

-- AddForeignKey
ALTER TABLE `schools` ADD CONSTRAINT `schools_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
