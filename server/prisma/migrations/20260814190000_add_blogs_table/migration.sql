-- Create BlogStatus enum
CREATE TYPE "BlogStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- Create blogs table
CREATE TABLE "blogs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "slug" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "thumbnail_storage_key" VARCHAR(500),
    "excerpt" TEXT,
    "meta_title" VARCHAR(255),
    "meta_description" TEXT,
    "status" "BlogStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT "blogs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "blogs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique constraint for slug per school
CREATE UNIQUE INDEX "blogs_school_id_slug_key" ON "blogs"("school_id", "slug");

-- Indexes for common queries
CREATE INDEX "blogs_school_id_idx" ON "blogs"("school_id");
CREATE INDEX "blogs_author_id_idx" ON "blogs"("author_id");
CREATE INDEX "blogs_status_idx" ON "blogs"("status");
CREATE INDEX "blogs_published_at_idx" ON "blogs"("published_at");
