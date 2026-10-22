-- CreateIndex (d'abord : la clé étrangère professional_id a besoin d'un index)
CREATE INDEX `appointments_professional_id_start_datetime_idx` ON `appointments`(`professional_id`, `start_datetime`);

-- DropIndex
DROP INDEX `appointments_professional_id_start_datetime_key` ON `appointments`;
