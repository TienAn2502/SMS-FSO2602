// public/sw.js
self.addEventListener('push', function (event) {
    console.log('🔥 Push event received by SW:', event);
    // if (!event.data) return;

    const data = event.data.json();
    console.log('data', data);
    const title = data.title || 'Thông báo mới';
    const options = {
        body: data.body || 'Bạn có một thông báo từ hệ thống.',
        // icon: '/icon.png', // Đường dẫn tới icon thông báo của trường học
        data: {
            url: data.url || '/', // Đường dẫn để điều hướng khi click vào thông báo
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Xử lý sự kiện khi người dùng click vào bảng thông báo nổi trên màn hình
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
