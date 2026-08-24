import type {
  BlogListParams,
  BlogListResult,
  BlogPost,
  CreateBlogInput,
} from '../types';

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toExcerpt(html: string, maxLength = 160): string {
  const text = stripHtml(html);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

function toSlug(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const SEED: BlogPost[] = [
  {
    id: 'blog-1',
    title: 'Thông báo lịch nghỉ lễ 30/4 – 1/5',
    slug: 'thong-bao-lich-nghi-le-30-4-1-5',
    excerpt:
      'Nhà trường thông báo lịch nghỉ lễ và kế hoạch dạy bù cho toàn thể cán bộ, giáo viên, học sinh.',
    contentHtml:
      '<p>Kính gửi quý thầy cô, phụ huynh và học sinh,</p><p>Nhà trường thông báo lịch nghỉ lễ <strong>30/4 – 1/5</strong> và lịch dạy bù sau kỳ nghỉ. Đề nghị mọi người theo dõi thời khóa biểu cập nhật trên hệ thống.</p><ul><li>Nghỉ: 30/4 và 1/5</li><li>Học bù: theo thông báo của từng khối</li></ul>',
    thumbnailUrl: null,
    status: 'PUBLISHED',
    authorName: 'Ban Giám hiệu',
    publishedAt: daysAgo(2),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },
  {
    id: 'blog-2',
    title: 'Họp phụ huynh học kỳ II',
    slug: 'hop-phu-huynh-hoc-ky-ii',
    excerpt:
      'Lịch họp phụ huynh theo từng khối lớp. Phụ huynh vui lòng sắp xếp thời gian tham dự đúng giờ.',
    contentHtml:
      '<p>Nhà trường tổ chức <strong>họp phụ huynh học kỳ II</strong> theo lịch sau:</p><ol><li>Khối 10: 18h00 Thứ Sáu tuần này</li><li>Khối 11: 18h00 Thứ Bảy tuần này</li><li>Khối 12: 18h00 Chủ Nhật tuần này</li></ol><p>Địa điểm: Hội trường lớn.</p>',
    thumbnailUrl: null,
    status: 'PUBLISHED',
    authorName: 'Ban Giám hiệu',
    publishedAt: daysAgo(5),
    createdAt: daysAgo(6),
    updatedAt: daysAgo(5),
  },
  {
    id: 'blog-3',
    title: 'Hướng dẫn đăng ký môn học tự chọn',
    slug: 'huong-dan-dang-ky-mon-hoc-tu-chon',
    excerpt:
      'Học sinh khối 10–11 đăng ký môn tự chọn trên portal trong tuần tới.',
    contentHtml:
      '<p>Học sinh đăng ký môn tự chọn trên <em>Portal</em> từ ngày 15 đến 20 tháng này. Sau hạn sẽ khóa form đăng ký.</p>',
    thumbnailUrl: null,
    status: 'PUBLISHED',
    authorName: 'Phòng Học vụ',
    publishedAt: daysAgo(8),
    createdAt: daysAgo(9),
    updatedAt: daysAgo(8),
  },
  {
    id: 'blog-4',
    title: 'Kế hoạch thi giữa kỳ II',
    slug: 'ke-hoach-thi-giua-ky-ii',
    excerpt:
      'Lịch thi giữa kỳ II áp dụng toàn trường. Học sinh mang thẻ học sinh khi vào phòng thi.',
    contentHtml:
      '<p>Nhà trường công bố kế hoạch thi giữa kỳ II. Chi tiết lịch thi từng môn sẽ được cập nhật trên hệ thống trong tuần tới.</p>',
    thumbnailUrl: null,
    status: 'PUBLISHED',
    authorName: 'Phòng Khảo thí',
    publishedAt: daysAgo(10),
    createdAt: daysAgo(11),
    updatedAt: daysAgo(10),
  },
  {
    id: 'blog-5',
    title: 'Chương trình ngoại khóa STEM tháng này',
    slug: 'chuong-trinh-ngoai-khoa-stem-thang-nay',
    excerpt:
      'Đăng ký tham gia câu lạc bộ STEM, số lượng có hạn theo từng khối.',
    contentHtml:
      '<p>Đăng ký CLB STEM tại văn phòng Đoàn / qua form online. Số lượng có hạn.</p>',
    thumbnailUrl: null,
    status: 'PUBLISHED',
    authorName: 'Ban Giám hiệu',
    publishedAt: daysAgo(12),
    createdAt: daysAgo(13),
    updatedAt: daysAgo(12),
  },
  {
    id: 'blog-6',
    title: 'Nhắc nhở đóng học phí học kỳ II',
    slug: 'nhac-nho-dong-hoc-phi-hoc-ky-ii',
    excerpt:
      'Phụ huynh hoàn tất học phí trước ngày 20. Chi tiết mức phí xem trên thông báo nhà trường.',
    contentHtml:
      '<p>Nhà trường nhắc nhở hoàn tất học phí học kỳ II trước ngày <strong>20</strong> tháng này.</p>',
    thumbnailUrl: null,
    status: 'PUBLISHED',
    authorName: 'Phòng Kế toán',
    publishedAt: daysAgo(14),
    createdAt: daysAgo(15),
    updatedAt: daysAgo(14),
  },
  {
    id: 'blog-7',
    title: 'Thông báo kiểm tra định kỳ môn Toán',
    slug: 'thong-bao-kiem-tra-dinh-ky-mon-toan',
    excerpt: 'Kiểm tra định kỳ Toán khối 10 diễn ra trong tuần tới.',
    contentHtml:
      '<p>Kiểm tra định kỳ môn Toán khối 10 sẽ diễn ra theo lịch của từng lớp. Giáo viên bộ môn thông báo chi tiết trên lớp.</p>',
    thumbnailUrl: null,
    status: 'PUBLISHED',
    authorName: 'Tổ Toán',
    publishedAt: daysAgo(16),
    createdAt: daysAgo(17),
    updatedAt: daysAgo(16),
  },
  {
    id: 'blog-8',
    title: 'Bản nháp: Nội quy thư viện (chưa công bố)',
    slug: 'ban-nhap-noi-quy-thu-vien',
    excerpt: 'Bản nháp nội quy thư viện — chỉ admin thấy khi lọc draft (mock).',
    contentHtml: '<p>Nội dung đang soạn thảo…</p>',
    thumbnailUrl: null,
    status: 'DRAFT',
    authorName: 'Ban Giám hiệu',
    publishedAt: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

/** In-memory store — thay bằng API khi có BE. */
let blogs: BlogPost[] = [...SEED];

function delay(ms = 250): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function fetchBlogs(
  params: BlogListParams,
  options?: { includeDrafts?: boolean },
): Promise<BlogListResult> {
  await delay();

  const publishedOnly = !options?.includeDrafts;
  const filtered = blogs
    .filter((post) => (publishedOnly ? post.status === 'PUBLISHED' : true))
    .sort((a, b) => {
      const aTime = a.publishedAt ?? a.createdAt;
      const bTime = b.publishedAt ?? b.createdAt;
      return bTime.localeCompare(aTime);
    });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  const page = Math.min(Math.max(1, params.page), totalPages);
  const start = (page - 1) * params.limit;
  const items = filtered.slice(start, start + params.limit);

  return {
    items,
    meta: {
      page,
      limit: params.limit,
      total,
      totalPages,
    },
  };
}

export async function fetchBlogById(id: string): Promise<BlogPost | null> {
  await delay();
  return blogs.find((post) => post.id === id) ?? null;
}

export async function createBlog(input: CreateBlogInput): Promise<BlogPost> {
  await delay(400);

  const now = new Date().toISOString();
  const baseSlug = toSlug(input.title) || 'bai-viet';
  const slug = `${baseSlug}-${Date.now().toString(36)}`;
  const post: BlogPost = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    slug,
    excerpt: toExcerpt(input.contentHtml),
    contentHtml: input.contentHtml,
    thumbnailUrl: input.thumbnailUrl ?? null,
    status: input.status,
    authorName: input.authorName,
    publishedAt: input.status === 'PUBLISHED' ? now : null,
    createdAt: now,
    updatedAt: now,
  };

  blogs = [post, ...blogs];
  return post;
}
