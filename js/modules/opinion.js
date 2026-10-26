/* Module 5: Nêu quan điểm và câu hỏi xoáy (HSK 7–9 phần 3 + IELTS Part 3). #/quandiem | #/quandiem/O001 */
window.Modules = window.Modules || {};
Modules.quandiem = {
  render(root, arg) {
    const list = Store.content.opinions || [];
    if (arg) { const o = list.find(x => x.id === arg); if (o) return this.work(root, o); }
    const done = Store.marks('opinion');
    root.innerHTML = `
      <header class="page-head"><h1>Quan điểm</h1>
        <p>Trả lời một câu hỏi lớn (bám phần 3 của HSK 7–9), sau đó lần lượt trả lời các câu hỏi xoáy giống phần thảo luận của IELTS. Câu hỏi xoáy chỉ hiện ra sau khi bạn nói xong câu trước.</p></header>
      <div class="row" style="margin-bottom:12px"><span class="spacer"></span><button type="button" class="btn" id="rand">Chọn ngẫu nhiên đề chưa làm</button></div>
      ${list.length ? `<ul class="item-list">${list.map(o => `<li><a href="#/quandiem/${U.esc(o.id)}"><span class="item-id">${U.esc(o.id)}</span>
        <span><span class="item-title zh">${U.esc(o.question)}</span><span class="item-sub">${U.esc(o.question_vi)}</span></span>
        <span class="item-meta">${done.has(o.id) ? '<span class="done-mark">Đã làm</span>' : ''}</span></a></li>`).join('')}</ul>` : '<div class="empty">Tab Opinions trên Sheet chưa có đề nào.</div>'}`;
    const rb = root.querySelector('#rand');
    rb && rb.addEventListener('click', () => { const pool = list.filter(o => !done.has(o.id)); const p = U.shuffle(pool.length ? pool : list)[0]; if (p) location.hash = '#/quandiem/' + p.id; });
  },

  work(root, o) {
    const key = 'opinion.' + o.id;
    const d = Store.draft(key) || { res: [] };
    const fu = U.lines(o.followups);
    const tasks = [{ title: o.question, prep: U.num(o.prep_sec, 60), speak: U.num(o.speak_sec, 90), main: true },
      ...fu.map(q => ({ title: q, prep: 0, speak: U.num(Store.cfg('followup_speak_sec', 45), 45) }))];
    root.innerHTML = `
      <a class="back" href="#/quandiem">Danh sách đề</a>
      <div class="row" style="margin-bottom:6px"><span class="muted small">${U.esc(o.id)}</span></div>
      <p class="q-big ${U.richClass()}">${U.rich(o.question, { marks: false })}</p>
      <div class="prompt-tools"><button type="button" class="link-btn" data-toggle-next="vi">Nghĩa tiếng Việt</button>
        ${o.hints ? '<button type="button" class="link-btn" data-toggle-next="hints">Gợi ý cách trả lời</button>' : ''}</div>
      <div data-part="vi" hidden class="muted" style="margin-top:6px">${U.esc(o.question_vi)}</div>
      ${o.hints ? `<ul data-part="hints" hidden class="tips" style="margin-top:8px">${U.lines(o.hints).map(h => `<li>${U.esc(h)}</li>`).join('')}</ul>` : ''}
      <div class="stack" id="tasks" style="margin-top:18px"></div>`;
    const wrap = root.querySelector('#tasks');
    const add = i => {
      if (i >= tasks.length) return finish();
      const t = tasks[i];
      const s = UI.speak({
        title: i ? `<span class="task-no">Câu hỏi xoáy ${i}</span> <span class="zh">${U.esc(t.title)}</span>` : '<span class="task-no">Câu hỏi chính</span>',
        prepSec: t.prep, speakSec: t.speak, notes: !!t.prep, value: d.res[i] || {},
        onDone: r => { d.res[i] = r; Store.saveDraft(key, d); if (!wrap.children[i + 1]) add(i + 1); }
      });
      wrap.appendChild(s.el);
      if (s.phase === 'done') add(i + 1);
    };
    const finish = () => {
      if (wrap.querySelector('#save')) return;
      wrap.insertAdjacentHTML('beforeend', `
        <details class="fold"><summary>Câu trả lời mẫu cho câu hỏi chính</summary><div class="fold-body"><p class="${U.richClass()}">${U.rich(o.sample, { marks: false })}</p></div></details>
        <div class="row"><button type="button" class="btn" id="reset">Làm lại từ đầu</button><button type="button" class="btn btn-primary" id="save">Tự chấm và lưu</button></div>`);
      wrap.querySelector('#reset').addEventListener('click', () => { Store.clearDraft(key); this.work(root, o); });
      wrap.querySelector('#save').addEventListener('click', async () => {
        const res = d.res;
        const content = tasks.map((t, i) => `【${i ? '追问' + i : '主问题'}】${t.title}\n${(res[i] && res[i].transcript) || '（未记录）'}`).join('\n\n');
        const sec = res.reduce((s, r) => s + (r ? r.speakSec : 0), 0);
        const here = location.hash;
        const ok = await UI.saveSpeaking({ scope: 'opinion', type: 'opinion', refId: o.id, title: o.question, content, speakSec: sec,
          notes: res.map(r => r && r.notes).filter(Boolean).join('\n'), data: { tasks: res.map(r => r && { sec: r.speakSec, rate: r.rate }) } });
        if (ok) { Store.clearDraft(key); Store.addMark('opinion', o.id); if (location.hash === here) location.hash = '#/quandiem'; }
      });
    };
    add(0);
  }
};
