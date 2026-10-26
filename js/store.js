/* Trạng thái và bộ nhớ trình duyệt (phiên đăng nhập, nội dung tải từ Sheet, bản nháp). */
const Store = (() => {
  const P = (window.APP_CONFIG && APP_CONFIG.STORAGE_PREFIX) || 'ky';
  const read = (k, d) => { try { const v = localStorage.getItem(`${P}.${k}`); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const write = (k, v) => { try { v === undefined ? localStorage.removeItem(`${P}.${k}`) : localStorage.setItem(`${P}.${k}`, JSON.stringify(v)); return true; } catch (e) { return false; } };

  const s = {
    session: read('session', null),       // { token, user: {username, displayName}, expiresAt }
    content: read('content', null),       // { methods, phrases, identify, frames, topics, checklist, config, loadedAt }
    prefs: Object.assign({ pinyin: false, beep: true, hideText: false, record: true }, read('prefs', {})),
    history: null                          // bộ nhớ tạm của trang Lịch sử
  };

  const userKey = k => `u.${s.session ? s.session.user.username : '_'}.${k}`;

  return {
    get session() { return s.session; },
    setSession(v) { s.session = v; write('session', v || undefined); },
    get content() { return s.content; },
    setContent(v) { s.content = v; if (!write('content', v)) console.warn('Không lưu được nội dung vào trình duyệt.'); },
    get prefs() { return s.prefs; },
    setPref(k, v) { s.prefs[k] = v; write('prefs', s.prefs); },
    get history() { return s.history; },
    setHistory(v) { s.history = v; },

    // Bản nháp theo từng người dùng
    draft(key) { return read(userKey('draft.' + key), null); },
    saveDraft(key, v) { write(userKey('draft.' + key), v); },
    clearDraft(key) { write(userKey('draft.' + key), undefined); },

    // Đánh dấu bài đã làm (để gợi ý câu chưa làm)
    marks(kind) { return new Set(read(userKey('done.' + kind), [])); },
    addMark(kind, id) { const set = this.marks(kind); set.add(id); write(userKey('done.' + kind), [...set]); },

    // Tra cứu nhanh nội dung
    find(tab, id) { return (s.content?.[tab] || []).find(x => String(x.id) === String(id)) || null; },
    rubric(scope) { return (s.content?.rubric || []).filter(r => !scope || r.scope === 'core' || r.scope === scope); },
    cfg(key, d) { const v = s.content?.config?.[key]; return v === undefined || v === '' ? d : v; }
  };
})();
