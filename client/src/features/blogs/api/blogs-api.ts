import { api } from '@/lib/api';
import type { ApiSuccessResponse } from '@/types/api.types';

export type BlogStatus = 'DRAFT' | 'PUBLISHED';

/** TiTip JSON content format */
export interface TiptapContent {
    type: 'doc';
    content?: TiptapNode[];
}

export interface TiptapNode {
    type: string;
    attrs?: Record<string, unknown>;
    content?: TiptapNode[];
    marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
    text?: string;
}

export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    /** Raw TiTip JSON - dùng khi edit */
    content: TiptapContent;
    /** Rendered HTML - dùng khi hiển thị */
    contentHtml: string;
    /** Plain text excerpt - dùng cho list/search */
    contentExcerpt: string;
    thumbnailUrl: string | null;
    thumbnailStorageKey: string | null;
    status: BlogStatus;
    authorId: string;
    authorName: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BlogListParams {
    page?: number;
    limit?: number;
    status?: BlogStatus;
    search?: string;
    sortBy?: 'createdAt' | 'publishedAt' | 'title';
    sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface BlogListResponse {
    items: BlogPost[];
    meta: PaginationMeta;
}

export interface CreateBlogInput {
    title: string;
    /** TiTip JSON content */
    content: TiptapContent;
    status: BlogStatus;
    thumbnailFileId?: string | null;
    thumbnailMimeType?: string | null;
    tempFiles?: Array<{
        fileId: string;
        mimeType: string;
        sizeBytes: number;
        originalName: string;
    }>;
    metaTitle?: string | null;
    metaDescription?: string | null;
}

export interface UpdateBlogInput {
    title?: string;
    /** TiTip JSON content */
    content?: TiptapContent;
    status?: BlogStatus;
    thumbnailFileId?: string | null;
    thumbnailMimeType?: string | null;
    tempFiles?: Array<{
        fileId: string;
        mimeType: string;
        sizeBytes: number;
        originalName: string;
    }>;
    metaTitle?: string | null;
    metaDescription?: string | null;
    fileNeedToDelete?: (string | undefined)[];
    thumbnailNeedToDelete?: string;
}

export async function fetchBlogs(
    params?: BlogListParams,
): Promise<BlogListResponse> {
    const { data } = await api.get<
        ApiSuccessResponse<BlogPost[], PaginationMeta>
    >('/blogs', { params });
    return {
        items: data.data ?? [],
        meta: data.meta ?? {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
        },
    };
}

export async function fetchBlogBySlug(slug: string): Promise<BlogPost> {
    const { data } = await api.get<ApiSuccessResponse<BlogPost>>(
        `/blogs/${slug}`,
    );
    return data.data;
}

export async function createBlog(input: CreateBlogInput): Promise<BlogPost> {
    const { data } = await api.post<ApiSuccessResponse<BlogPost>>(
        '/blogs',
        input,
    );
    return data.data;
}

export async function updateBlog(
    slug: string,
    input: UpdateBlogInput,
): Promise<BlogPost> {
    const { data } = await api.patch<ApiSuccessResponse<BlogPost>>(
        `/blogs/${slug}`,
        input,
    );
    return data.data;
}

export async function deleteBlog(id: string): Promise<void> {
    await api.delete(`/blogs/${id}`);
}

export async function refreshImageUrls(
    storageKeys: string[],
): Promise<Record<string, string>> {
    const { data } = await api.post<ApiSuccessResponse<Record<string, string>>>(
        '/files/refresh-urls',
        { storageKeys },
    );
    return data.data;
}
