import { useEffect, useRef, useState, useCallback } from 'react';
import { refreshImageUrls } from '@/features/blogs/api/blogs-api';

const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // Refresh 5 phút trước khi hết hạn

interface CachedUrl {
    url: string;
    expiresAt: number;
}

/**
 * Hook để quản lý và tự động refresh signed URLs trước khi hết hạn.
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                     useRefreshImageUrls                          │
 * │                                                                 │
 * │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
 * │  │   init       │───▶│   cache      │───▶│  schedule    │    │
 * │  │   keys       │    │   URLs       │    │  refresh     │    │
 * │  └──────────────┘    └──────────────┘    └──────┬───────┘    │
 * │                                                  │             │
 * │                              ┌───────────────────┘             │
 * │                              ▼                                 │
 * │                      ┌──────────────┐                         │
 * │                      │ setTimeout   │ (chờ đến lúc refresh)   │
 * │                      │ (5 phút)    │                         │
 * │                      └──────┬───────┘                         │
 * │                             ▼                                 │
 * │                      ┌──────────────┐                         │
 * │                      │  fetch new   │                         │
 * │                      │  URLs        │                         │
 * │                      └──────────────┘                         │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * Timeline ví dụ:
 * 
 * Thời gian    12:00   12:05   12:10   12:15   12:20   12:25   12:30
 *             │       │       │       │       │       │       │
 * URL A       ├───────┼───────┼───────┼───────┼───────┼───────┤
 * (hết 12:15)         [REFRESH]                        [REFRESH]
 *             
 * URL B       ├───────────────┼───────────────┼───────────────┤
 * (hết 12:25)                         [REFRESH]                        
 *                                     (tính lại từ A)
 * 
 * Cách dùng:
 * 
 * ```tsx
 * // Default: dùng cho blogs
 * const { urls, refreshUrls } = useRefreshImageUrls(['key1', 'key2']);
 * 
 * // Custom refresh function cho notifications
 * const { urls, refreshUrls } = useRefreshImageUrls(['key1'], {
 *   refreshFn: (keys) => refreshNotificationUrls(keys)
 * });
 * 
 * // Trong component:
 * <img src={urls.get('key1')} />
 * 
 * // Hoặc refresh thủ côc:
 * refreshUrls(['key3']);
 * ```
 */
export function useRefreshImageUrls(
    initialKeys: string[] = [],
    options?: {
        refreshFn?: (keys: string[]) => Promise<Record<string, string>>;
    },
) {
    const [urls, setUrls] = useState<Map<string, string>>(new Map());
    const cacheRef = useRef<Map<string, CachedUrl>>(new Map());
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Default refresh function (for blogs), can be overridden
    const defaultRefreshFn = useCallback(
        async (keys: string[]) => {
            return refreshImageUrls(keys);
        },
        [],
    );

    const refreshFn = options?.refreshFn ?? defaultRefreshFn;

    // ═══════════════════════════════════════════════════════════════════════════
    // Bước 1: Tính thời gian hết hạn từ signed URL
    // 
    // Signed URL có dạng:
    // https://bucket.r2.dev/temp/key?X-Amz-Date=20240101T120000Z&X-Amz-Expires=900&...
    // 
    // Logic:
    // 1. Parse "X-Amz-Expires=900" → 900 giây = 15 phút
    // 2. Parse "X-Amz-Date=20240101T120000Z" → thời điểm tạo URL
    // 3. Tính: thời điểm tạo + expires = thời điểm hết hạn
    //
    // Ví dụ: 12:00 + 15 phút = 12:15 → URL hết hạn lúc 12:15
    // ═══════════════════════════════════════════════════════════════════════════
    const getExpiryFromUrl = useCallback((url: string): number => {
        try {
            const expiresMatch = url.match(/X-Amz-Expires=(\d+)/);
            if (expiresMatch) {
                const expiresSec = parseInt(expiresMatch[1], 10);
                const dateMatch = url.match(/X-Amz-Date=([^&]+)/);
                if (dateMatch) {
                    const dateStr = decodeURIComponent(dateMatch[1]);
                    const date = new Date(dateStr);
                    return date.getTime() + expiresSec * 1000;
                }
            }
            // Fallback: giả sử URL sống ~15 phút
            return Date.now() + 15 * 60 * 1000;
        } catch {
            return Date.now() + 15 * 60 * 1000;
        }
    }, []);

    // ═══════════════════════════════════════════════════════════════════════════
    // Bước 2: Fetch và cache URLs từ server
    // 
    // Gọi API /blogs/refresh-urls để lấy signed URL mới (với thời hạn mới)
    // Sau khi nhận URL mới, cập nhật:
    // - cacheRef: lưu URL + thời gian hết hạn (để schedule refresh tiếp)
    // - urls state: để trigger re-render và hiển thị ảnh
    //
    // Cache structure:
    // Map {
    //   "storageKey1" → { url: "https://...", expiresAt: 12:15 },
    //   "storageKey2" → { url: "https://...", expiresAt: 12:20 },
    // }
    // ═══════════════════════════════════════════════════════════════════════════
    const fetchAndCacheUrls = useCallback(
        async (storageKeys: string[]) => {
            if (storageKeys.length === 0) return;

            try {
                // Gọi API refresh để lấy signed URL mới (với thời hạn mới)
                const newUrls = await refreshFn(storageKeys);

                const updatedCache = new Map(cacheRef.current);
                const updatedUrls = new Map(urls);

                // Cập nhật cache và state cho mỗi URL mới
                for (const [key, url] of Object.entries(newUrls)) {
                    const expiresAt = getExpiryFromUrl(url);
                    updatedCache.set(key, { url, expiresAt });
                    updatedUrls.set(key, url);
                }

                cacheRef.current = updatedCache;
                setUrls(updatedUrls);
            } catch (error) {
                console.error('Failed to refresh image URLs:', error);
            }
        },
        [urls, getExpiryFromUrl, refreshFn],
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // Bước 3: Schedule refresh - Đặt timer để refresh trước khi URL hết hạn
    // 
    // REFRESH_BEFORE_EXPIRY_MS = 5 phút (buffer để đảm bảo refresh xong kịp)
    // 
    // Logic:
    // 1. Duyệt tất cả URLs trong cache
    // 2. Tính thời gian đến lúc cần refresh = expiresAt - now - 5 phút
    // 3. Chọn thời gian sớm nhất (vì phải refresh tất cả cùng lúc)
    // 4. Đặt setTimeout để gọi fetchAndCacheUrls khi đến lúc
    //
    // Ví dụ:
    // - URL A hết hạn lúc 12:15 → refresh lúc 12:10 (12:15 - 5 phút)
    // - URL B hết hạn lúc 12:20 → refresh lúc 12:15 (12:20 - 5 phút)
    // → Đặt setTimeout 5 phút, gọi fetchAndCacheUrls(["A", "B"])
    // → Nhận URL mới (hết hạn lúc 12:30) → schedule refresh tiếp (12:25)
    // ═══════════════════════════════════════════════════════════════════════════
    const scheduleRefresh = useCallback(() => {
        // Clear timer cũ nếu có (tránh duplicate)
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
        }

        const now = Date.now();
        let minTimeUntilRefresh = Infinity;

        // Tìm URL hết hạn sớm nhất
        for (const [, cached] of cacheRef.current) {
            // Tính: thời gian đến lúc refresh = hết hạn - now - buffer(5 phút)
            const timeUntilRefresh =
                cached.expiresAt - now - REFRESH_BEFORE_EXPIRY_MS;
            if (
                timeUntilRefresh > 0 &&
                timeUntilRefresh < minTimeUntilRefresh
            ) {
                minTimeUntilRefresh = timeUntilRefresh;
            }
        }

        // Đặt timer để refresh khi đến lúc
        if (minTimeUntilRefresh < Infinity) {
            refreshTimerRef.current = setTimeout(() => {
                const keys = Array.from(cacheRef.current.keys());
                void fetchAndCacheUrls(keys);
            }, minTimeUntilRefresh);
        }
    }, [fetchAndCacheUrls]);

    // ═══════════════════════════════════════════════════════════════════════════
    // Bước 4: Khởi tạo - Fetch URLs khi component mount
    // 
    // Trigger đầu tiên: khi initialKeys có giá trị
    // Gọi fetchAndCacheUrls để lấy signed URLs từ server
    // ═══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (initialKeys.length > 0) {
            void fetchAndCacheUrls(initialKeys);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ═══════════════════════════════════════════════════════════════════════════
    // Bước 5: Schedule refresh khi cache thay đổi
    // 
    // Mỗi khi fetchAndCacheUrls chạy → cacheRef thay đổi → scheduleRefresh được gọi
    // Đặt timer mới dựa trên thời gian hết hạn mới
    // 
    // Cleanup: clear timer khi component unmount hoặc scheduleRefresh thay đổi
    // ═══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        scheduleRefresh();
        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, [scheduleRefresh]);

    // ═══════════════════════════════════════════════════════════════════════════
    // Bước 6: Hàm refresh thủ côc (optional)
    // 
    // Cho phép gọi refresh từ bên ngoài nếu cần
    // - refreshUrls(['key1', 'key2']): refresh specific keys
    // - refreshUrls(): refresh tất cả keys trong cache
    // ═══════════════════════════════════════════════════════════════════════════
    const refreshUrls = useCallback(
        (storageKeys?: string[]) => {
            if (storageKeys) {
                void fetchAndCacheUrls(storageKeys);
            } else {
                const allKeys = Array.from(cacheRef.current.keys());
                void fetchAndCacheUrls(allKeys);
            }
        },
        [fetchAndCacheUrls],
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // Bước 7: Cleanup khi unmount
    // 
    // Clear timer để tránh memory leak khi component bị unmount
    // ═══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, []);

    // ═══════════════════════════════════════════════════════════════════════════
    // Return values:
    // 
    // - urls: Map<storageKey, signedUrl> - dùng để hiển thị ảnh
    // - refreshUrls: fn - gọi thủ côc để refresh URLs
    // - hasUrl: fn - check xem URL đã được cache chưa
    // ═══════════════════════════════════════════════════════════════════════════
    return {
        /** Map của storageKey -> URL (đã refresh nếu cần). Dùng: urls.get('key') */
        urls,
        /** Hàm để refresh URLs theo storageKeys, hoặc refresh tất cả nếu không truyền args */
        refreshUrls,
        /** Check xem URL có trong cache chưa */
        hasUrl: useCallback(
            (storageKey: string) => cacheRef.current.has(storageKey),
            [],
        ),
    };
}
