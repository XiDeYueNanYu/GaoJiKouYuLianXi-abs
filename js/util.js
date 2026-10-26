/* Hàm tiện ích: văn bản tiếng Trung, nhãn đánh dấu, đếm chữ, tốc độ nói, từ nối. */
const U = (() => {
  // Nhãn tuỳ ý: 【观点】…【/观点】, tối đa 6 ký tự
  const MARK_RE = /【(\/?)([^【】\/]{1,6})】/g;
  const PALETTE = 6;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const stripMarks = t => String(t ?? '').replace(MARK_RE, '');
  // Một ô nhiều mục: xuống dòng thật hoặc ngăn bằng “ || ”
  const lines = t => String(t ?? '').split(/\r?\n|\s*\|\|\s*/).map(s => s.trim()).filter(Boolean);
  // “Tên：giải thích” → { name, desc }; tên bỏ phần trong ngoặc （…）
  const splitStep = s => { const i = String(s).search(/[：:]/); const raw = i >= 0 ? s.slice(0, i) : s; return { name: raw.replace(/（.*?）|\(.*?\)/g, '').trim(), label: raw.trim(), desc: i >= 0 ? s.slice(i + 1).trim() : '' }; };
  const hasPinyin = () => typeof window.pinyinPro !== 'undefined' && typeof window.pinyinPro.html === 'function';

  function textHtml(seg, pinyin) {
    return String(seg).split(/\r?\n/).map(line => {
      if (pinyin && hasPinyin() && /[一-鿿]/.test(line)) {
        try { return window.pinyinPro.html(esc(line)); } catch (e) { return esc(line); }
      }
      return esc(line);
    }).join('<br>');
  }

  /** Thứ tự nhãn xuất hiện trong văn bản → chỉ số màu. */
  function labelsOf(text) {
    const out = [];
    String(text ?? '').replace(MARK_RE, (m, close, name) => { if (!close && !out.includes(name)) out.push(name); return m; });
    return out;
  }

  /** Văn bản có nhãn → HTML có gạch chân theo màu. order: danh sách nhãn để cố định màu. */
  function rich(text, { marks = true, pinyin = Store.prefs.pinyin, order } = {}) {
    const src = String(text ?? '');
    const labels = order || labelsOf(src);
    let out = '', last = 0, open = null, m;
    MARK_RE.lastIndex = 0;
    while ((m = MARK_RE.exec(src))) {
      out += textHtml(src.slice(last, m.index), pinyin);
      last = MARK_RE.lastIndex;
      if (!marks) continue;
      if (m[1]) { if (open) { out += '</span>'; open = null; } }
      else {
        if (open) out += '</span>';
        open = m[2];
        const idx = Math.max(0, labels.indexOf(m[2])) % PALETTE;
        out += `<span class="mk mk-${idx}" data-label="${esc(m[2])}">`;
      }
    }
    out += textHtml(src.slice(last), pinyin);
    if (open) out += '</span>';
    return out;
  }
  function richClass(extra = '') { return `rich${Store.prefs.pinyin && hasPinyin() ? ' pinyin' : ''} ${extra}`.trim(); }
  function legend(text, order) {
    const labels = order || labelsOf(text);
    if (!labels.length) return '';
    return `<div class="legend" aria-label="Chú giải">${labels.map((l, i) => `<span><i class="mk mk-${i % PALETTE}">${esc(l)}</i></span>`).join('')}</div>`;
  }

  function pinyinOf(text) {
    if (!hasPinyin()) return '';
    try { return window.pinyinPro.pinyin(String(text).replace(/[…]+/g, ' … '), { nonZh: 'consecutive' }); } catch (e) { return ''; }
  }

  /** Đếm chữ: total = mọi ký tự trừ khoảng trắng; han = số chữ Hán. */
  function count(text) {
    const t = stripMarks(text);
    return { total: t.replace(/[\s　]/g, '').length, han: (t.match(/[㐀-鿿豈-﫿]/g) || []).length };
  }
  /** Tốc độ nói (chữ Hán/phút). */
  // Trên 450 chữ/phút là không thực tế (thường do bấm “Nói xong” sớm rồi mới gõ bản ghi) → không tính
  const rate = (text, sec) => { if (sec <= 3) return 0; const r = Math.round(count(text).han / sec * 60); return r > 450 ? 0 : r; };
  /** Thời lượng ước tính (giây) khi đọc với tốc độ r chữ/phút. */
  const duration = (text, r) => Math.round(count(text).han / Math.max(60, r) * 60);

  // Từ đệm hay lặp khi nói
  const FILLERS = ['然后', '就是', '那个', '这个', '嗯', '啊', '对吧', '其实'];
  function fillers(text, warnAt = 3) {
    const t = String(text ?? '');
    return FILLERS.map(w => ({ w, n: t.split(w).length - 1 })).filter(x => x.n >= warnAt).sort((a, b) => b.n - a.n);
  }

  /** Khoá đếm của một mẫu câu: vế đầu ≥2 chữ, hoặc ghép hai vế đầu khi vế đầu chỉ 1 chữ. */
  function phraseKeys(p) {
    return String(p.zh || '').split('/').map(alt => {
      const segs = alt.split(/……|…|，|,|：|“|”|、|。|！|？|；|\s+/).map(s => s.trim()).filter(Boolean);
      if (!segs.length) return '';
      if (segs[0].length >= 2) return segs[0].length > 8 ? '' : segs[0];
      return segs.length >= 2 ? segs[0] + '…' + segs[1] : '';
    }).filter(Boolean);
  }
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function countOcc(text, key) {
    if (key.includes('…')) return (text.match(new RegExp(key.split('…').map(reEsc).join('[^。！？\\n]{1,20}?'), 'g')) || []).length;
    let n = 0, i = 0; while ((i = text.indexOf(key, i)) !== -1) { n++; i += key.length; } return n;
  }
  /** Mẫu câu trong kho đã xuất hiện trong lời nói. */
  function usedPhrases(text, phrases) {
    const t = String(text ?? ''), seen = new Set(), out = [];
    (phrases || []).forEach(p => phraseKeys(p).forEach(k => {
      if (seen.has(k)) return; seen.add(k);
      const n = countOcc(t, k); if (n) out.push({ key: k, n, category: p.category });
    }));
    return out;
  }

  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pad = n => String(n).padStart(2, '0');
  const fmtTime = sec => { const s = Math.max(0, Math.round(Math.abs(sec))); return Math.floor(s / 60) + ':' + pad(s % 60); };
  const fmtDate = iso => { const d = new Date(iso); if (isNaN(d)) return ''; return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const num = (v, d = 0) => { const n = Number(v); return v !== '' && v !== null && v !== undefined && isFinite(n) ? n : d; };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  const isOn = v => !['không', 'khong', 'no', 'false', '0'].includes(String(v ?? '').trim().toLowerCase());
  const ZH_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  return { MARK_RE, esc, stripMarks, lines, splitStep, labelsOf, rich, richClass, legend, pinyinOf, hasPinyin, count, rate, duration, fillers, usedPhrases, shuffle, fmtTime, fmtDate, num, debounce, el, isOn, ZH_NUM };
})();
