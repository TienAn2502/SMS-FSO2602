const getStorageKey = (url: string): string | undefined => {
    return url.match(/\.r2\.cloudflarestorage\.com\/(?:temp\/)?([^?]+)/)?.[1];
};
export { getStorageKey };
