/* Gọi Google Apps Script Web App. Dùng POST text/plain để tránh preflight CORS (Apps Script không hỗ trợ). */
class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const Api = {
  configured() {
    const url = window.APP_CONFIG && APP_CONFIG.API_URL;
    return !!url && /^https?:\/\//.test(url);
  },

  async call(action, payload = {}) {
    if (!this.configured()) {
      throw new ApiError('NO_CONFIG', 'Chưa cấu hình URL Web App. Mở js/config.js và dán URL kết thúc bằng /exec vào API_URL.');
    }
    const body = JSON.stringify(Object.assign({ action, token: Store.session ? Store.session.token : '' }, payload));
    let res;
    try {
      res = await fetch(APP_CONFIG.API_URL, { method: 'POST', body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' });
    } catch (e) {
      throw new ApiError('NETWORK', 'Không kết nối được máy chủ. Kiểm tra mạng, hoặc kiểm tra Web App đã triển khai với quyền truy cập "Bất kỳ ai".');
    }
    let data;
    try { data = await res.json(); }
    catch (e) { throw new ApiError('BAD_RESPONSE', 'Máy chủ trả về dữ liệu không đọc được. Kiểm tra URL trong js/config.js là URL /exec của bản triển khai mới nhất.'); }
    if (!data.ok) {
      if (data.error === 'AUTH_REQUIRED' && action !== 'login') App.onAuthLost(data.message);
      throw new ApiError(data.error || 'ERROR', data.message || 'Có lỗi xảy ra.');
    }
    return data;
  }
};
