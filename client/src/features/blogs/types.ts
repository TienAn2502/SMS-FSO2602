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
    authorName: string;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BlogListParams {
    page: number;
    limit: number;
}

export interface BlogListResult {
    items: BlogPost[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CreateBlogInput {
    title: string;
    /** TiTip JSON content */
    content: TiptapContent;
    thumbnailUrl?: string | null;
    status: BlogStatus;
    authorName: string;
}
