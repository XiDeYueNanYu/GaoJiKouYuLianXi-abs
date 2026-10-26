/* Khởi động, đăng nhập, điều hướng. */
const App = (() => {
  const $ = UI.$;
  const ROUTES = ['thuvien', 'sosanh', 'phanxa', 'tailieu', 'quandiem', 'dichnoi', 'truyenthong', 'lichsu'];

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    const [mod, arg, sub] = path.split('/');
    const query = Object.fromEntries(new URLSearchParams(qs || ''));
    return { mod: ROUTES.includes(mod) ? mod : 'thuvien', arg: arg ? decodeURIComponent(arg) : '', sub: sub || '', query };
  }

  function route() {
    if (!Store.session || !Store.content) return;
    const { mod, arg, sub, query } = parseHash();
    document.querySelectorAll('.rail-list a').forEach(a => a.classList.toggle('active', a.dataset.route === mod));
    const act = document.querySelector('.rail-list a.active');
    if (act && window.matchMedia('(max-width: 860px)').matches) act.scrollIntoView({ inline: 'center', block: 'nearest' });
    const view = $('#view');
    view.innerHTML = '';
    try { Modules[mod].render(view, arg, query, sub); }
    catch (err) { console.error(err); view.innerHTML = UI.errorBox(err); }
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function showLogin(message) {
    $('#app-view').hidden = true;
    $('#login-view').hidden = false;
    const err = $('#login-error');
    err.hidden = !message; err.textContent = message || '';
    if (!Api.configured()) { err.hidden = false; err.textContent = 'Chưa cấu hình URL Web App. Mở js/config.js và dán URL /exec vào API_URL.'; }
    setTimeout(() => $('#login-form').username.focus(), 0);
  }

  function showApp() {
    $('#login-view').hidden = true;
    $('#app-view').hidden = false;
    $('#rail-user').textContent = Store.session.user.displayName;
    $('#pref-pinyin').checked = !!Store.prefs.pinyin;
    $('#pref-beep').checked = !!Store.prefs.beep;
    drawMeta();
    route();
  }

  function drawMeta() {
    const c = Store.content;
    $('#content-meta').textContent = c && c.loadedAt ? 'Dữ liệu tải lúc ' + U.fmtDate(c.loadedAt) : '';
  }

  async function loadContent() {
    const r = await Api.call('getContent');
    Store.setContent(Object.assign({}, r.content, { loadedAt: r.loadedAt }));
    drawMeta();
  }

  async function onLogin(e) {
    e.preventDefault();
    const f = e.currentTarget, btn = f.querySelector('button[type=submit]'), err = $('#login-error');
    err.hidden = true;
    btn.disabled = true; btn.textContent = 'Đang đăng nhập…';
    try {
      const r = await Api.call('login', { username: f.username.value.trim(), password: f.password.value });
      Store.setSession({ token: r.token, user: r.user, expiresAt: r.expiresAt });
      btn.textContent = 'Đang tải dữ liệu…';
      await loadContent();
      f.password.value = '';
      if (!location.hash) location.hash = '#/thuvien';
      showApp();
    } catch (ex) {
      err.hidden = false; err.textContent = ex.message;
    } finally { btn.disabled = false; btn.textContent = 'Đăng nhập'; }
  }

  async function refresh() {
    const b = $('#btn-refresh');
    b.disabled = true; b.textContent = 'Đang tải…';
    try { await loadContent(); Store.setHistory(null); UI.toast('Đã tải lại dữ liệu từ Sheet.'); route(); }
    catch (e) { UI.toast(e.message, 'bad'); }
    finally { b.disabled = false; b.textContent = 'Tải lại dữ liệu'; }
  }

  function logout() {
    if (Store.session) Api.call('logout').catch(() => {});
    Store.setSession(null);
    Store.setHistory(null);
    showLogin('');
  }

  function onAuthLost(message) {
    Store.setSession(null);
    showLogin(message || 'Phiên đăng nhập đã hết hạn.');
  }

  function openMobileSettings() {
    UI.modal({
      title: Store.session.user.displayName,
      body: `<div class="stack">
        <label class="switch"><input type="checkbox" data-pref="pinyin" ${Store.prefs.pinyin ? 'checked' : ''}><span>Hiện pinyin</span></label>
        <label class="switch"><input type="checkbox" data-pref="beep" ${Store.prefs.beep ? 'checked' : ''}><span>Tiếng bíp khi hết giờ</span></label>
        <p class="muted small">${U.esc($('#content-meta').textContent)}</p></div>`,
      actions: [{ label: 'Đăng xuất', value: 'logout' }, { label: 'Tải lại dữ liệu', value: 'refresh' }, { label: 'Đóng', kind: 'primary', value: null }]
    }).then(v => { if (v === 'logout') logout(); if (v === 'refresh') refresh(); });
  }

  function init() {
    // Thanh tuỳ chọn cho màn hình hẹp (thanh bên bị ẩn)
    const bar = U.el(`<div class="mobile-settings" style="padding:12px 16px 0;text-align:right"><button type="button" class="link-btn" id="btn-mobile-settings">Tuỳ chọn</button></div>`);
    $('#app-view').insertBefore(bar, $('#view'));
    bar.querySelector('button').addEventListener('click', openMobileSettings);

    $('#login-form').addEventListener('submit', onLogin);
    $('#btn-logout').addEventListener('click', logout);
    $('#btn-refresh').addEventListener('click', refresh);
    window.addEventListener('hashchange', route);

    // Tuỳ chọn ở bất kỳ đâu: pinyin, tiếng bíp, ẩn tài liệu khi nói
    document.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'pref-pinyin' || t.dataset.pref === 'pinyin') {
        Store.setPref('pinyin', t.checked); $('#pref-pinyin').checked = t.checked;
        if (t.checked && !U.hasPinyin()) UI.toast('Thư viện pinyin chưa tải được (cần mạng). Thử tải lại trang.', 'bad');
        if (!document.querySelector('.spk[data-phase="prep"], .spk[data-phase="speak"], #blocks')) route();
        else UI.toast('Pinyin sẽ áp dụng khi bạn mở trang khác.');
      } else if (t.id === 'pref-beep' || t.dataset.pref === 'beep') {
        Store.setPref('beep', t.checked); $('#pref-beep').checked = t.checked;
      } else if (t.dataset.pref) Store.setPref(t.dataset.pref, t.checked);
    });
    // Nút bật/tắt phần mở rộng (bản dịch, gợi ý)
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-toggle-next]'); if (!b) return;
      const part = b.closest('.view, .modal').querySelector(`[data-part="${b.dataset.toggleNext}"]`);
      if (part) part.hidden = !part.hidden;
    });

    if (Store.session && Store.content) {
      if (Store.session.expiresAt && new Date(Store.session.expiresAt) < new Date()) return onAuthLost('Phiên đăng nhập đã hết hạn.');
      showApp();
    } else if (Store.session) {
      loadContent().then(showApp).catch(e => showLogin(e.message));
    } else showLogin('');
  }

  document.addEventListener('DOMContentLoaded', init);
  return { onAuthLost, route };
})();
