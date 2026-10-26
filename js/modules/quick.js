/* Module 3: Phản xạ nhanh (kiểu IELTS Part 1). #/phanxa */
window.Modules = window.Modules || {};
Modules.phanxa = {
  render(root) {
    const qs = Store.content.quick || [];
    const topics = [...new Set(qs.map(q => q.topic || 'Khác'))];
    const pref = Store.draft('quick.setup') || { topic: '', n: 5 };
    root.innerHTML = `
      <header class="page-head"><h1>Phản xạ nhanh</h1>
        <p>Một loạt câu hỏi đời thường, mỗi câu chỉ có vài giây đọc đề rồi nói ngay ${U.num(Store.cfg('quick_speak_sec', 30), 30)} giây. Mục tiêu: câu đầu trả lời thẳng, sau đó thêm một lý do hoặc ví dụ.</p></header>
      <div class="panel setup">
        <label>Chủ đề<select id="topic"><option value="">Trộn mọi chủ đề</option>${topics.map(t => `<option ${t === pref.topic ? 'selected' : ''}>${U.esc(t)}</option>`).join('')}</select></label>
        <label>Số câu mỗi lượt<select id="n">${[3, 5, 8, 10].map(n => `<option ${n === pref.n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <button type="button" class="btn btn-primary" id="go">Bắt đầu</button>
      </div>
      <p class="small muted" style="margin-top:12px">${qs.length} câu hỏi trong kho. Câu chưa làm được ưu tiên.</p>`;
    root.querySelector('#go').addEventListener('click', () => {
      const topic = root.querySelector('#topic').value, n = Number(root.querySelector('#n').value);
      Store.saveDraft('quick.setup', { topic, n });
      const pool = qs.filter(q => !topic || q.topic === topic), seen = Store.marks('quick');
      const list = [...U.shuffle(pool.filter(q => !seen.has(q.id))), ...U.shuffle(pool.filter(q => seen.has(q.id)))].slice(0, n);
      if (!list.length) return UI.toast('Không có câu hỏi nào cho chủ đề này.', 'bad');
      this.round(root, list);
    });
  },

  round(root, list) {
    const results = [];
    const prep = U.num(Store.cfg('quick_prep_sec', 5), 5), defSpeak = U.num(Store.cfg('quick_speak_sec', 30), 30);
    const show = i => {
      if (i >= list.length) return this.summary(root, list, results);
      const q = list[i];
      root.innerHTML = `
        <div class="row" style="margin-bottom:10px"><span class="muted small">Câu ${i + 1} / ${list.length}</span><span class="tag">${U.esc(q.topic)}</span><span class="spacer"></span>
          <button type="button" class="link-btn small" id="stop">Kết thúc lượt</button></div>
        <p class="q-big ${U.richClass()}">${U.rich(q.question_zh, { marks: false })}</p>
        <div class="prompt-tools"><button type="button" class="link-btn" data-toggle-next="vi">Nghĩa tiếng Việt</button>
          ${q.hint ? '<button type="button" class="link-btn" data-toggle-next="hint">Gợi ý mẫu câu</button>' : ''}</div>
        <div data-part="vi" hidden class="muted" style="margin-top:6px">${U.esc(q.question_vi)}</div>
        <div data-part="hint" hidden class="zh hint-line">${U.lines(q.hint).map(U.esc).join('　/　')}</div>
        <div id="spk" style="margin-top:16px"></div><div id="after"></div>`;
      root.querySelector('#stop').addEventListener('click', () => this.summary(root, list.slice(0, results.length), results));
      const s = UI.speak({
        prepSec: prep, speakSec: U.num(q.speak_sec, defSpeak), notes: false,
        onDone: r => {
          results[i] = r;
          const after = root.querySelector('#after');
          if (after.dataset.shown) return;
          after.dataset.shown = '1';
          after.innerHTML = `<details class="fold" style="margin-top:14px"><summary>Câu trả lời mẫu</summary><div class="fold-body"><p class="${U.richClass()}">${U.rich(q.sample, { marks: false })}</p></div></details>
            <div class="row" style="margin-top:14px"><button type="button" class="btn btn-primary" id="next">${i + 1 < list.length ? 'Câu tiếp theo' : 'Xem tổng kết'}</button></div>`;
          after.querySelector('#next').addEventListener('click', () => { results[i] = s.result(); Store.addMark('quick', q.id); show(i + 1); });
        }
      });
      root.querySelector('#spk').appendChild(s.el);
    };
    show(0);
  },

  summary(root, list, results) {
    const done = list.map((q, i) => ({ q, r: results[i] })).filter(x => x.r);
    if (!done.length) return this.render(root);
    const totalSec = done.reduce((s, x) => s + x.r.speakSec, 0);
    const text = done.map(x => x.r.transcript).join('\n');
    root.innerHTML = `
      <header class="page-head"><h1>Tổng kết lượt</h1><p>${done.length} câu, tổng thời gian nói ${U.fmtTime(totalSec)}${U.rate(text, totalSec) ? `, trung bình ${U.rate(text, totalSec)} chữ/phút` : ''}.</p></header>
      <ol class="sum-list">${done.map(x => `<li><p class="zh" style="font-weight:600">${U.esc(x.q.question_zh)}</p>
        <p class="zh">${x.r.transcript ? U.esc(x.r.transcript) : '<span class="muted">(chưa ghi lời nói)</span>'}</p>
        <p class="small muted">${U.fmtTime(x.r.speakSec)}${x.r.rate ? `, ${x.r.rate} chữ/phút` : ''}</p></li>`).join('')}</ol>
      <div class="row" style="margin-top:18px"><button type="button" class="btn" id="again">Lượt mới</button><button type="button" class="btn btn-primary" id="save">Tự chấm và lưu</button></div>`;
    root.querySelector('#again').addEventListener('click', () => this.render(root));
    root.querySelector('#save').addEventListener('click', async () => {
      const content = done.map(x => `问：${x.q.question_zh}\n答：${x.r.transcript || '（未记录）'}`).join('\n\n');
      const ok = await UI.saveSpeaking({ scope: 'quick', type: 'quick', refId: done.map(x => x.q.id).join(','), title: `Phản xạ nhanh: ${done.length} câu`, content, speakSec: totalSec,
        data: { items: done.map(x => ({ id: x.q.id, sec: x.r.speakSec, rate: x.r.rate })) }, intro: `Chấm chung cho cả lượt ${done.length} câu.` });
      if (ok) this.render(root);
    });
  }
};
