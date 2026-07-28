-- RenameColumn
ALTER TABLE "teachers" RENAME COLUMN "avatar_field_id" TO "avatar_file_id";

-- RenameForeignKey
ALTER TABLE "teachers" RENAME CONSTRAINT "teachers_avatar_field_id_fkey" TO "teachers_avatar_file_id_fkey";
