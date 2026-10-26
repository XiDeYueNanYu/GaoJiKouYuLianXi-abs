/* Module 4: Thuật lại và trả lời theo tài liệu (HSK 7–9 phần 1–2). #/tailieu | #/tailieu/M001 */
window.Modules = window.Modules || {};
Modules.tailieu = {
  render(root, arg) {
    const list = Store.content.materials || [];
    if (arg) { const m = list.find(x => x.id === arg); if (m) return this.work(root, m); }
    const done = Store.marks('material');
    const types = [...new Set(list.map(m => m.type || 'Khác'))];
    root.innerHTML = `
      <header class="page-head"><h1>Tài liệu</h1>
        <p>Bám phần 1 và 2 của khẩu ngữ HSK 7–9: đọc một văn bản (văn bản ứng dụng, tự sự hoặc nghị luận), thuật lại hoặc nêu quan điểm, rồi trả lời ba câu hỏi dựa trên tài liệu.</p></header>
      ${list.length ? types.map(t => `<section class="section"><h2 class="zh">${U.esc(t)}</h2><ul class="item-list">
        ${list.filter(m => (m.type || 'Khác') === t).map(m => `<li><a href="#/tailieu/${U.esc(m.id)}"><span class="item-id">${U.esc(m.id)}</span>
          <span class="item-title zh">${U.esc(m.title)}</span><span class="item-meta">${done.has(m.id) ? '<span class="done-mark">Đã làm</span>' : ''}<span class="tag">${U.count(m.text).han} chữ</span></span></a></li>`).join('')}
      </ul></section>`).join('') : '<div class="empty">Tab Materials trên Sheet chưa có tài liệu nào.</div>'}`;
  },

  work(root, m) {
    const key = 'material.' + m.id;
    const d = Store.draft(key) || { res: [] };
    const qs = U.lines(m.questions), samples = U.lines(m.samples);
    const tasks = [
      { title: m.task, sample: m.task_sample, prep: U.num(m.prep_sec, 60), speak: U.num(m.speak_sec, 120), main: true },
      ...qs.map((q, i) => ({ title: q, sample: samples[i] || '', prep: U.num(Store.cfg('question_prep_sec', 15), 15), speak: U.num(m.q_speak_sec, U.num(Store.cfg('question_speak_sec', 45), 45)) }))
    ];
    const readSec = U.num(m.read_sec, 90);
    root.innerHTML = `
      <a class="back" href="#/tailieu">Danh sách tài liệu</a>
      <div class="row" style="margin-bottom:6px"><span class="tag zh">${U.esc(m.type)}</span><span class="muted small">${U.esc(m.id)}</span></div>
      <h1 class="h-zh">${U.esc(m.title)}</h1>
      <div class="ws">
        <div class="stack" id="tasks"></div>
        <aside class="ws-side">
          <div class="side-block" id="mat">
            <div class="row"><h3 style="margin:0">Tài liệu</h3><span class="spacer"></span><span class="read-time" id="rt">${U.fmtTime(readSec)}</span></div>
            <div class="mat-text ${U.richClass()}" id="mt">${U.rich(m.text, { marks: false })}</div>
            <p class="muted small mat-hidden" hidden>Tài liệu đang ẩn trong lúc bạn nói.</p>
            <div class="row" style="margin-top:10px"><button type="button" class="btn btn-sm" id="read">Bắt đầu tính giờ đọc</button>
              <label class="switch small"><input type="checkbox" data-pref="hideText" ${Store.prefs.hideText ? 'checked' : ''}><span>Ẩn tài liệu khi nói</span></label></div>
          </div>
        </aside>
      </div>`;
    // đồng hồ đọc
    let readTimer = null;
    root.querySelector('#read').addEventListener('click', e => {
      if (readTimer) return;
      const end = Date.now() + readSec * 1000; e.currentTarget.disabled = true;
      readTimer = setInterval(() => {
        const rt = root.querySelector('#rt'); if (!rt) return clearInterval(readTimer);
        const left = (end - Date.now()) / 1000; rt.textContent = U.fmtTime(left);
        if (left <= 0) { clearInterval(readTimer); rt.classList.add('over'); UI.beep(660); }
      }, 250);
    });
    const hideText = on => {
      const hide = on && Store.prefs.hideText;
      root.querySelector('#mt').hidden = hide; root.querySelector('.mat-hidden').hidden = !hide;
    };
    const wrap = root.querySelector('#tasks');
    const persist = () => Store.saveDraft(key, d);
    const addTask = i => {
      if (i >= tasks.length) return finish();
      const t = tasks[i];
      const box = U.el(`<div class="task"></div>`);
      wrap.appendChild(box);
      const s = UI.speak({
        title: `<span class="task-no">${t.main ? 'Nhiệm vụ chính' : 'Câu hỏi ' + i}</span> <span class="zh">${U.esc(t.title)}</span>`,
        prepSec: t.prep, speakSec: t.speak, value: d.res[i] || {},
        ai: { scope: 'material', context: () => ({ material: m.text, question: t.title, sample: t.sample }) },
        onPhase: p => hideText(p === 'prep' || p === 'speak'),
        onDone: r => {
          d.res[i] = r; persist();
          if (!box.querySelector('.fold')) {
            box.insertAdjacentHTML('beforeend', `<details class="fold"><summary>Câu trả lời mẫu</summary><div class="fold-body"><p class="${U.richClass()}">${U.rich(t.sample, { marks: false })}</p></div></details>`);
            if (!wrap.children[i + 1]) addTask(i + 1);
          }
        }
      });
      box.prepend(s.el);
      if (d.res[i] && d.res[i].transcript !== undefined && s.phase === 'done') {
        box.insertAdjacentHTML('beforeend', `<details class="fold"><summary>Câu trả lời mẫu</summary><div class="fold-body"><p class="${U.richClass()}">${U.rich(t.sample, { marks: false })}</p></div></details>`);
        addTask(i + 1);
      }
    };
    const finish = () => {
      if (wrap.querySelector('#save')) return;
      wrap.insertAdjacentHTML('beforeend', `<div class="row"><button type="button" class="btn" id="reset">Làm lại từ đầu</button><button type="button" class="btn btn-primary" id="save">Tự chấm và lưu</button></div>`);
      wrap.querySelector('#reset').addEventListener('click', () => { Store.clearDraft(key); this.work(root, m); });
      wrap.querySelector('#save').addEventListener('click', async () => {
        const res = d.res;
        const content = tasks.map((t, i) => `【${t.main ? '任务' : '问题' + i}】${t.title}\n${(res[i] && res[i].transcript) || '（未记录）'}`).join('\n\n');
        const sec = res.reduce((s, r) => s + (r ? r.speakSec : 0), 0);
        const here = location.hash;
        const ok = await UI.saveSpeaking({ scope: 'material', type: 'material', refId: m.id, title: m.title, content, speakSec: sec,
          notes: res.map(r => r && r.notes).filter(Boolean).join('\n'), ai: res.map(r => r && r.ai),
          data: { tasks: res.map(r => r && { sec: r.speakSec, rate: r.rate }) } });
        if (ok) { Store.clearDraft(key); Store.addMark('material', m.id); if (location.hash === here) location.hash = '#/tailieu'; }
      });
    };
    addTask(0);
  }
};
