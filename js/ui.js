/* Thành phần dùng chung: thông báo, hộp thoại, khung nói có đồng hồ, tự chấm, máy nhắc chữ. */
const UI = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  function toast(msg, kind = '') {
    const t = U.el(`<div class="toast ${kind}" role="status">${U.esc(msg)}</div>`);
    $('#toast-host').appendChild(t);
    setTimeout(() => t.remove(), kind === 'bad' ? 6000 : 3200);
  }

  function modal({ title, body, actions = [{ label: 'Đóng', value: null }], wide = false, onMount }) {
    return new Promise(resolve => {
      const back = U.el(`<div class="modal-back"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
        <h2>${U.esc(title)}</h2><div class="modal-body"></div><div class="modal-actions"></div></div></div>`);
      const bodyEl = $('.modal-body', back);
      if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
      const prevFocus = document.activeElement;
      const close = v => { back.remove(); document.removeEventListener('keydown', onKey); prevFocus && prevFocus.focus && prevFocus.focus(); resolve(v); };
      actions.forEach(a => {
        const b = U.el(`<button type="button" class="btn ${a.kind === 'primary' ? 'btn-primary' : ''}">${U.esc(a.label)}</button>`);
        b.addEventListener('click', () => { const v = typeof a.value === 'function' ? a.value(back) : a.value; if (v !== false) close(v); });
        $('.modal-actions', back).appendChild(b);
      });
      const onKey = e => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', onKey);
      back.addEventListener('click', e => { if (e.target === back) close(null); });
      document.body.appendChild(back);
      onMount && onMount(back);
      const f = back.querySelector('.modal-actions .btn-primary, .modal-actions .btn');
      f && f.focus();
    });
  }

  // Tiếng “bíp” báo chuyển giai đoạn (không cần file âm thanh)
  let actx = null;
  function beep(freq = 880, ms = 160) {
    if (!Store.prefs.beep) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(0.15, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + ms / 1000);
      o.start(); o.stop(actx.currentTime + ms / 1000);
    } catch (e) { /* trình duyệt chặn âm thanh: bỏ qua */ }
  }

  /**
   * Khung một lượt nói: chuẩn bị (đếm ngược) → nói (đếm ngược, hoặc đếm xuôi nếu speakSec = 0) → xong.
   * Bản ghi lời nói gõ được ngay khi đang nói (dùng đọc chính tả của bàn phím) hoặc sau khi nói.
   */
  function speak({ title = '', prepSec = 0, speakSec = 60, notes = true, value = {}, onDone, onPhase } = {}) {
    const el = U.el(`<section class="spk" data-phase="ready">
      ${title ? `<h3 class="spk-title">${title}</h3>` : ''}
      <div class="spk-clock">
        <span class="spk-phase"></span>
        <span class="spk-time" aria-live="off"></span>
      </div>
      <div class="spk-bar" aria-hidden="true"><i></i></div>
      <div class="spk-actions row"></div>
      ${notes ? `<label class="spk-notes">Ý chính (ghi nhanh khi chuẩn bị)<textarea class="field zh" rows="2" placeholder="Từ khoá, khung trả lời…"></textarea></label>` : ''}
      <label class="spk-tr" hidden>Lời bạn đã nói<textarea class="field zh" rows="5" placeholder="Bật đọc chính tả tiếng Trung trên bàn phím điện thoại rồi nói, hoặc gõ lại sau khi nói xong."></textarea></label>
      <div class="spk-stats small"></div>
    </section>`);
    const notesTa = $('.spk-notes textarea', el), trWrap = $('.spk-tr', el), trTa = $('.spk-tr textarea', el);
    if (notesTa) notesTa.value = value.notes || '';
    trTa.value = value.transcript || '';
    let phase = value.transcript ? 'done' : 'ready', endsAt = 0, startedSpeak = 0, spoken = U.num(value.speakSec, 0), timer = null;

    const setPhase = p => {
      phase = p; el.dataset.phase = p;
      if (p === 'speak' || p === 'done') trWrap.hidden = false;
      drawActions(); tick();
      onPhase && onPhase(p);
    };
    const total = () => phase === 'prep' ? prepSec : speakSec;
    function tick() {
      if (!el.isConnected && timer) { clearInterval(timer); timer = null; return; }
      const label = { ready: 'Sẵn sàng', prep: 'Chuẩn bị', speak: 'Đang nói', done: 'Đã xong' }[phase];
      $('.spk-phase', el).textContent = label;
      let shown = 0, frac = 0;
      if (phase === 'ready') shown = prepSec || speakSec;
      else if (phase === 'prep' || (phase === 'speak' && speakSec)) {
        const left = (endsAt - Date.now()) / 1000;
        shown = left; frac = 1 - Math.max(0, left) / total();
        if (left <= 0) { if (phase === 'prep') { beep(660); startSpeak(); } else { beep(440, 300); finish(); } return; }
      } else if (phase === 'speak') { shown = (Date.now() - startedSpeak) / 1000; frac = 0; }
      else if (phase === 'done') shown = spoken;
      $('.spk-time', el).textContent = U.fmtTime(shown);
      $('.spk-bar i', el).style.width = (frac * 100) + '%';
    }
    function run() { if (!timer) timer = setInterval(tick, 200); }
    function startPrep() { endsAt = Date.now() + prepSec * 1000; setPhase('prep'); run(); notesTa && notesTa.focus(); }
    function startSpeak() { startedSpeak = Date.now(); endsAt = startedSpeak + speakSec * 1000; setPhase('speak'); run(); }
    function finish() {
      if (phase === 'speak') spoken = Math.round((Date.now() - startedSpeak) / 1000);
      clearInterval(timer); timer = null;
      setPhase('done'); drawStats();
      onDone && onDone(result());
    }
    function drawActions() {
      const a = $('.spk-actions', el);
      const btn = (label, fn, primary) => { const b = U.el(`<button type="button" class="btn ${primary ? 'btn-primary' : ''}">${label}</button>`); b.addEventListener('click', fn); a.appendChild(b); return b; };
      a.innerHTML = '';
      if (phase === 'ready') {
        if (prepSec) { btn(`Bắt đầu chuẩn bị (${prepSec}s)`, startPrep, true); btn('Nói luôn', startSpeak); }
        else btn(speakSec ? `Bắt đầu nói (${speakSec}s)` : 'Bắt đầu nói', startSpeak, true);
      } else if (phase === 'prep') btn('Chuẩn bị xong, nói luôn', () => { beep(660); startSpeak(); }, true);
      else if (phase === 'speak') btn('Nói xong', () => { beep(440, 200); finish(); }, true);
      else if (phase === 'done') btn('Nói lại lượt này', () => { trTa.value = ''; spoken = 0; $('.spk-stats', el).innerHTML = ''; startSpeak(); });
    }
    function drawStats() {
      const t = trTa.value;
      if (!U.count(t).han) { $('.spk-stats', el).innerHTML = `<p class="muted">Đã nói ${U.fmtTime(spoken)}. Gõ hoặc đọc chính tả lời bạn đã nói để xem tốc độ và từ nối.</p>`; return; }
      const r = U.rate(t, spoken), f = U.fillers(t), used = U.usedPhrases(t, Store.content.phrases);
      $('.spk-stats', el).innerHTML = `<p><b>${U.count(t).han}</b> chữ trong ${U.fmtTime(spoken)}${r ? `, khoảng <b>${r}</b> chữ/phút` : ''}.</p>
        ${used.length ? `<p class="muted">Mẫu câu trong kho đã dùng: <span class="zh">${used.map(x => U.esc(x.key) + (x.n > 1 ? '×' + x.n : '')).join('、')}</span></p>` : ''}
        ${f.length ? `<p class="warn">Từ đệm lặp nhiều: ${f.map(x => `<span class="zh">${U.esc(x.w)}</span> ×${x.n}`).join(', ')}</p>` : ''}`;
    }
    trTa.addEventListener('input', U.debounce(() => { if (phase === 'done') drawStats(); onDone && phase === 'done' && onDone(result()); }, 400));
    notesTa && notesTa.addEventListener('input', U.debounce(() => onDone && phase === 'done' && onDone(result()), 400));
    const result = () => ({ notes: notesTa ? notesTa.value.trim() : '', transcript: trTa.value.trim(), speakSec: spoken, chars: U.count(trTa.value).han, rate: U.rate(trTa.value, spoken) });

    setPhase(phase);
    if (phase === 'done') drawStats();
    return { el, result, get phase() { return phase; }, start: () => phase === 'ready' && (prepSec ? startPrep() : startSpeak()) };
  }

  /** Tự chấm: thang 1–5 cho từng tiêu chí + checklist + ghi chú. scope: quick | material | opinion | interp | media */
  function assess(scope, { title = 'Tự chấm', intro = '' } = {}) {
    const crit = Store.rubric(scope);
    const items = (Store.content.checklist || []).filter(c => String(c.scope || '').split(/[,，\s]+/).includes(scope));
    const body = `${intro ? `<div class="muted" style="margin-bottom:10px">${intro}</div>` : ''}
      <div class="rubric-pick">${crit.map(c => `
        <div class="rp" data-id="${U.esc(c.id)}">
          <div class="rp-head"><b class="zh">${U.esc(c.name_zh)}</b><span>${U.esc(c.name_vi)}</span></div>
          <div class="rp-scale" role="radiogroup" aria-label="${U.esc(c.name_vi)}">
            ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="rp-n" data-n="${n}" role="radio" aria-checked="false">${n}</button>`).join('')}
            <button type="button" class="rp-n rp-skip" data-n="" role="radio" aria-checked="true" title="Không chấm tiêu chí này">Bỏ qua</button>
          </div>
          <p class="rp-desc small muted">1: ${U.esc(c.desc_1)}</p>
        </div>`).join('')}</div>
      ${items.length ? `<h3 class="check-title">Checklist</h3>${items.map(c => `
        <label class="check-item"><input type="checkbox" data-id="${U.esc(c.id)}"><span>${U.esc(c.text_vi)}<span class="zh">${U.esc(c.text_zh || '')}</span></span></label>`).join('')}` : ''}
      <label style="margin-top:14px">Ghi chú cho lần sau<textarea class="field" name="note" rows="2" placeholder="Điều cần cải thiện…"></textarea></label>`;
    const descFor = (c, n) => n <= 1 ? `1: ${c.desc_1}` : n === 2 ? `2: giữa mức 1 và 3. ${c.desc_3}` : n === 3 ? `3: ${c.desc_3}` : n === 4 ? `4: giữa mức 3 và 5. ${c.desc_5}` : `5: ${c.desc_5}`;
    return modal({
      title, body, wide: true,
      onMount: root => root.querySelectorAll('.rp').forEach(rp => {
        const c = crit.find(x => x.id === rp.dataset.id);
        rp.addEventListener('click', e => {
          const b = e.target.closest('.rp-n'); if (!b) return;
          rp.querySelectorAll('.rp-n').forEach(x => x.setAttribute('aria-checked', String(x === b)));
          rp.querySelector('.rp-desc').textContent = b.dataset.n ? descFor(c, Number(b.dataset.n)) : 'Không chấm tiêu chí này.';
        });
        rp.addEventListener('mouseover', e => { const b = e.target.closest('.rp-n[data-n]:not(.rp-skip)'); if (b) rp.querySelector('.rp-desc').textContent = descFor(c, Number(b.dataset.n)); });
      }),
      actions: [
        { label: 'Quay lại', value: null },
        {
          label: 'Lưu bài', kind: 'primary', value: root => {
            const scores = {};
            root.querySelectorAll('.rp').forEach(rp => { const b = rp.querySelector('.rp-n[aria-checked="true"]'); if (b && b.dataset.n) scores[rp.dataset.id] = Number(b.dataset.n); });
            const boxes = [...root.querySelectorAll('.check-item input')];
            return {
              scores, done: boxes.filter(b => b.checked).length, total: boxes.length,
              missed: boxes.filter(b => !b.checked).map(b => items.find(i => String(i.id) === b.dataset.id).text_vi),
              note: root.querySelector('[name=note]').value.trim()
            };
          }
        }
      ]
    });
  }

  /** Máy nhắc chữ toàn màn hình. Trả về Promise { sec } = số giây đã chạy. */
  function teleprompter(text, { rate = 230 } = {}) {
    return new Promise(resolve => {
      const est = Math.max(10, U.duration(text, rate));
      const ov = U.el(`<div class="tp" role="dialog" aria-modal="true" aria-label="Máy nhắc chữ">
        <div class="tp-top row">
          <span class="tp-time">0:00</span><span class="muted small">/ ước tính ${U.fmtTime(est)}</span><span class="spacer"></span>
          <button type="button" class="btn btn-sm" data-a="slower" title="Chậm hơn">Chậm</button>
          <span class="tp-speed small"></span>
          <button type="button" class="btn btn-sm" data-a="faster" title="Nhanh hơn">Nhanh</button>
          <button type="button" class="btn btn-sm" data-a="smaller" title="Chữ nhỏ hơn">A−</button>
          <button type="button" class="btn btn-sm" data-a="bigger" title="Chữ to hơn">A+</button>
          <button type="button" class="btn btn-sm" data-a="restart">Về đầu</button>
          <button type="button" class="btn btn-sm btn-primary" data-a="close">Đóng</button>
        </div>
        <div class="tp-view"><div class="tp-text zh">${U.rich(text, { pinyin: false, marks: false })}</div></div>
        <div class="tp-guide" aria-hidden="true"></div>
        <button type="button" class="tp-play btn btn-primary" data-a="play">Bắt đầu đọc</button>
      </div>`);
      document.body.appendChild(ov);
      const view = $('.tp-view', ov), txt = $('.tp-text', ov);
      let factor = 1, size = U.num(Store.prefs.tpSize, 34), playing = false, elapsed = 0, last = 0, pos = 0, raf = 0;
      const pxPerSec = () => (txt.scrollHeight) / est * factor;
      const drawSpeed = () => { $('.tp-speed', ov).textContent = Math.round(rate * factor) + ' chữ/phút'; };
      const loop = t => {
        if (!playing) return;
        const dt = last ? (t - last) / 1000 : 0; last = t;
        elapsed += dt; pos += pxPerSec() * dt; view.scrollTop = pos;
        $('.tp-time', ov).textContent = U.fmtTime(elapsed);
        const max = view.scrollHeight - view.clientHeight;
        if (pos >= max) { pos = max; view.scrollTop = max; toggle(false); return; }
        raf = requestAnimationFrame(loop);
      };
      const toggle = on => {
        playing = on ?? !playing; last = 0;
        $('.tp-play', ov).textContent = playing ? 'Tạm dừng' : (elapsed ? 'Tiếp tục' : 'Bắt đầu đọc');
        if (playing) raf = requestAnimationFrame(loop); else cancelAnimationFrame(raf);
      };
      const setSize = v => { size = Math.max(20, Math.min(64, v)); txt.style.fontSize = size + 'px'; Store.setPref('tpSize', size); };
      const close = () => { toggle(false); ov.remove(); document.removeEventListener('keydown', onKey); resolve({ sec: Math.round(elapsed) }); };
      const onKey = e => {
        if (e.key === 'Escape') close();
        if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); toggle(); }
        if (e.key === 'ArrowUp') { pos = Math.max(0, pos - 60); view.scrollTop = pos; }
        if (e.key === 'ArrowDown') { pos += 60; view.scrollTop = pos; }
      };
      ov.addEventListener('click', e => {
        const a = e.target.closest('[data-a]'); if (!a) return;
        ({ play: () => toggle(), close, slower: () => { factor = Math.max(0.5, factor - 0.1); drawSpeed(); }, faster: () => { factor = Math.min(2, factor + 0.1); drawSpeed(); },
          smaller: () => setSize(size - 4), bigger: () => setSize(size + 4), restart: () => { pos = 0; view.scrollTop = 0; elapsed = 0; $('.tp-time', ov).textContent = '0:00'; } })[a.dataset.a]();
      });
      view.addEventListener('wheel', () => { pos = view.scrollTop; }, { passive: true });
      view.addEventListener('touchmove', () => { pos = view.scrollTop; }, { passive: true });
      document.addEventListener('keydown', onKey);
      setSize(size); drawSpeed();
      $('.tp-play', ov).focus();
    });
  }

  function phraseButtons(list) {
    if (!list.length) return '<p class="muted small">Không có gợi ý.</p>';
    return `<div class="sugg">${list.map(p => `<button type="button" class="chip zh" data-insert="${U.esc(p.zh)}" title="${U.esc(p.vi)}">${U.esc(p.zh)}</button>`).join('')}</div>`;
  }
  /** Chèn văn bản vào ô đang soạn, chọn sẵn phần “……” để gõ đè. */
  function insertInto(field, text) {
    if (!field) return;
    const s = field.selectionStart ?? field.value.length, e = field.selectionEnd ?? field.value.length;
    field.focus(); field.setRangeText(text, s, e, 'end');
    const i = text.indexOf('……'); if (i >= 0) field.setSelectionRange(s + i, s + i + 2);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function errorBox(err, retryLabel) {
    return `<div class="error-box"><p>${U.esc(err.message || String(err))}</p>${retryLabel ? `<p style="margin-top:10px"><button class="btn btn-sm" data-retry>${U.esc(retryLabel)}</button></p>` : ''}</div>`;
  }

  /** Lưu một bài nói lên Sheet sau khi tự chấm. Trả về true nếu lưu được. */
  async function saveSpeaking({ scope, type, refId, title, content, notes = '', speakSec = 0, data = {}, intro = '' }) {
    const res = await assess(scope, { intro });
    if (!res) return false;
    const c = U.count(content);
    try {
      await Api.call('submit', {
        type, refId, title, content, notes, data, charCount: c.han, speakSec, rate: U.rate(content, speakSec),
        scores: res.scores, checklistDone: res.done, checklistTotal: res.total, checklistMissed: res.missed, note: res.note
      });
      Store.setHistory(null);
      toast('Đã lưu lên Sheet.');
      return true;
    } catch (err) {
      toast('Chưa lưu được: ' + err.message + ' Bản nháp vẫn còn trên máy, hãy thử lại.', 'bad');
      return false;
    }
  }

  return { $, toast, modal, beep, speak, assess, teleprompter, phraseButtons, insertInto, errorBox, saveSpeaking };
})();
