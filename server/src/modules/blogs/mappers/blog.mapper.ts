import type { Blog } from '@prisma/client';

import { tiptapJsonToHtml, tiptapJsonToPlainText } from '@/modules/blogs/utils/tiptap-json-to-html';

export interface BlogResponse {
  id: string;
  title: string;
  slug: string;
  /** Raw TiTip JSON content - dùng khi edit */
  content: object;
  /** HTML content - dùng khi hiển thị */
  contentHtml: string;
  /** Plain text excerpt - dùng cho search/list */
  contentExcerpt: string;
  thumbnailUrl: string | null;
  thumbnailStorageKey: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  authorId: string;
  authorName: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const blogInclude = {
  author: {
    select: {
      id: true,
      fullName: true,
    },
  },
};

export function toBlogResponse(
  blog: Blog & { author?: { id: string; fullName: string | null } | null },
  thumbnailUrl?: string | null,
): BlogResponse {
  const rawContent = blog.content as object | null;
  const contentHtml = rawContent ? tiptapJsonToHtml(rawContent) : '';
  const contentExcerpt = rawContent ? tiptapJsonToPlainText(rawContent) : '';

  return {
    id: blog.id,
    title: blog.title,
    slug: blog.slug,
    content: rawContent ?? {},
    contentHtml,
    contentExcerpt,
    thumbnailUrl: thumbnailUrl ?? null,
    thumbnailStorageKey: blog.thumbnailStorageKey ?? null,
    status: blog.status,
    authorId: blog.authorId,
    authorName: blog.author?.fullName ?? null,
    metaTitle: blog.metaTitle,
    metaDescription: blog.metaDescription,
    publishedAt: blog.publishedAt?.toISOString() ?? null,
    createdAt: blog.createdAt.toISOString(),
    updatedAt: blog.updatedAt.toISOString(),
  };
}
