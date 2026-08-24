-- Create NotificationType enum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

-- Create NotificationRoomType enum
CREATE TYPE "NotificationRoomType" AS ENUM ('SCHOOL', 'HOMEROOM', 'GRADE', 'COURSE');

-- Create notifications table
CREATE TABLE "notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content_html" TEXT NOT NULL,
    "thumbnail_storage_key" VARCHAR(500),
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "notifications_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create notification_rooms table
CREATE TABLE "notification_rooms" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "notification_id" UUID NOT NULL,
    "room_type" "NotificationRoomType" NOT NULL,
    "target_id" UUID,
    CONSTRAINT "notification_rooms_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add indexes for notifications
CREATE INDEX "notifications_school_id_idx" ON "notifications"("school_id");
CREATE INDEX "notifications_created_by_id_idx" ON "notifications"("created_by_id");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- Add indexes for notification_rooms
CREATE UNIQUE INDEX "notification_rooms_notification_id_room_type_target_id_idx" ON "notification_rooms"("notification_id", "room_type", "target_id");
CREATE INDEX "notification_rooms_notification_id_idx" ON "notification_rooms"("notification_id");
