/* Module 8: Dịch nói Việt → Trung. #/dichnoi | #/dichnoi/T001 */
window.Modules = window.Modules || {};
Modules.dichnoi = {
  render(root, arg) {
    const list = Store.content.interp || [];
    if (arg) { const t = list.find(x => x.id === arg); if (t) return this.work(root, t); }
    const done = Store.marks('interp');
    const topics = [...new Set(list.map(t => t.topic || 'Khác'))];
    root.innerHTML = `
      <header class="page-head"><h1>Dịch nói</h1>
        <p>Đề HSK 7–9 có 2 câu dịch nói, và tiếng Việt là một trong các ngôn ngữ nguồn được chọn. Đọc đoạn tiếng Việt, chuẩn bị nhanh, rồi nói bản dịch tiếng Trung. Sau đó so với bản tham khảo và kiểm tra thuật ngữ.</p></header>
      ${list.length ? topics.map(tp => `<section class="section"><h2>${U.esc(tp)}</h2><ul class="item-list">
        ${list.filter(t => (t.topic || 'Khác') === tp).map(t => `<li><a href="#/dichnoi/${U.esc(t.id)}"><span class="item-id">${U.esc(t.id)}</span>
          <span class="item-title vi">${U.esc(String(t.text_vi).slice(0, 90))}…</span>
          <span class="item-meta">${done.has(t.id) ? '<span class="done-mark">Đã làm</span>' : ''}</span></a></li>`).join('')}</ul></section>`).join('')
        : '<div class="empty">Tab Interp trên Sheet chưa có bài nào.</div>'}`;
  },

  work(root, t) {
    const key = 'interp.' + t.id;
    const d = Store.draft(key) || {};
    const terms = U.lines(t.terms).map(x => { const [vi, zh] = x.split(/\s*=\s*/); return { vi: (vi || '').trim(), zh: (zh || '').split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean) }; });
    root.innerHTML = `
      <a class="back" href="#/dichnoi">Danh sách bài</a>
      <div class="row" style="margin-bottom:6px"><span class="tag">${U.esc(t.topic)}</span><span class="muted small">${U.esc(t.id)}</span>
        <span class="spacer"></span><label class="switch small"><input type="checkbox" data-pref="hideText" ${Store.prefs.hideText ? 'checked' : ''}><span>Ẩn đoạn văn khi nói (chế độ thi)</span></label></div>
      <div class="panel vi-text" id="src"><p>${U.esc(t.text_vi)}</p></div>
      <p class="muted small mat-hidden" hidden>Đoạn văn đang ẩn trong lúc bạn nói.</p>
      <div id="spk" style="margin-top:16px"></div>
      <div id="after" class="stack" style="margin-top:16px"></div>`;
    const src = root.querySelector('#src'), hidden = root.querySelector('.mat-hidden');
    const s = UI.speak({
      title: '<span class="task-no">Nói bản dịch tiếng Trung</span>', prepSec: U.num(t.prep_sec, 30), speakSec: U.num(t.speak_sec, 70), value: d,
      ai: { scope: 'interp', context: () => ({ source_vi: t.text_vi, reference: t.reference_zh, terms: t.terms }) },
      onPhase: p => { const h = p === 'speak' && Store.prefs.hideText; src.hidden = h; hidden.hidden = !h; },
      onDone: r => { Object.assign(d, r); Store.saveDraft(key, d); this.after(root, t, terms, d); }
    });
    root.querySelector('#spk').appendChild(s.el);
    if (s.phase === 'done') this.after(root, t, terms, d);
  },

  after(root, t, terms, d) {
    const box = root.querySelector('#after');
    const tr = d.transcript || '';
    const hit = terms.map(x => ({ ...x, ok: x.zh.some(z => tr.includes(z)) }));
    const nHit = hit.filter(x => x.ok).length;
    box.innerHTML = `
      <section class="panel"><h2 style="margin-bottom:8px">Bản dịch tham khảo</h2><p class="${U.richClass()}">${U.rich(t.reference_zh, { marks: false })}</p>
        <p class="small muted" style="margin-top:8px">Đây là một cách dịch, không phải cách duy nhất.</p></section>
      ${hit.length ? `<section><h2 style="margin-bottom:8px">Thuật ngữ (${tr ? `${nHit}/${hit.length} có trong bản dịch của bạn` : 'ghi lời nói để tự kiểm tra'})</h2>
        <table class="terms"><tbody>${hit.map(x => `<tr class="${tr ? (x.ok ? 'ok' : 'miss') : ''}"><td>${U.esc(x.vi)}</td><td class="zh">${U.esc(x.zh.join(' / '))}</td><td class="mark">${tr ? (x.ok ? 'Có' : 'Thiếu') : ''}</td></tr>`).join('')}</tbody></table>
        <p class="small muted" style="margin-top:6px">“Thiếu” chỉ nghĩa là không thấy đúng từ này; bạn có thể đã dùng cách nói khác vẫn đúng.</p></section>` : ''}
      ${t.notes ? `<section class="note-box"><b>Lưu ý khi dịch:</b> ${U.esc(t.notes)}</section>` : ''}
      <div class="row"><button type="button" class="btn" id="reset">Làm lại</button><button type="button" class="btn btn-primary" id="save">Tự chấm và lưu</button></div>`;
    box.querySelector('#reset').addEventListener('click', () => { Store.clearDraft('interp.' + t.id); this.work(root, t); });
    box.querySelector('#save').addEventListener('click', async () => {
      if (!tr) return UI.toast('Hãy ghi lại lời bạn đã nói trước khi lưu.', 'bad');
      const here = location.hash;
        const ok = await UI.saveSpeaking({ scope: 'interp', type: 'interp', refId: t.id, title: String(t.text_vi).slice(0, 60) + '…', content: tr, notes: d.notes, speakSec: d.speakSec, ai: [d.ai],
        data: { termsHit: nHit, termsTotal: hit.length, missed: hit.filter(x => !x.ok).map(x => x.vi) }, intro: `Thuật ngữ khớp: ${nHit}/${hit.length}.` });
      if (ok) { Store.clearDraft('interp.' + t.id); Store.addMark('interp', t.id); if (location.hash === here) location.hash = '#/dichnoi'; }
    });
  }
};
