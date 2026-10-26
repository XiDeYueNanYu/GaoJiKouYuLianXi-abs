/*
 * Cấu hình. Sau khi triển khai Apps Script dưới dạng Ứng dụng web,
 * dán URL kết thúc bằng /exec vào API_URL bên dưới.
 * URL này có thể để công khai trên GitHub: mọi thao tác đều cần đăng nhập.
 */
window.APP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyZuFYJH0kDTQr-kTL83cM8Sc8ZaAc2XYDrpXGB3dj6TcYjndbXGhbaF3PEECqUrbhW/exec',
  // Tiền tố khoá lưu trong trình duyệt. Đổi nếu chạy nhiều bản trên cùng tên miền.
  STORAGE_PREFIX: 'ky'
};
