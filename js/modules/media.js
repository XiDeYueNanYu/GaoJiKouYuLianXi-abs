/* Module 7: Xưởng kịch bản truyền thông (抖音 / 小红书).
   #/truyenthong                 danh sách loại nội dung
   #/truyenthong/<loại>          hướng dẫn, kịch bản mẫu, ý tưởng
   #/truyenthong/<loại>/soan?idea=Y001   soạn kịch bản */
window.Modules = window.Modules || {};
Modules.truyenthong = {
  rateDef: () => U.num(Store.cfg('speaking_rate', 230), 230),

  render(root, arg, query, sub) {
    const types = Store.content.mediatypes || [];
    if (arg) {
      const t = types.find(x => x.id === arg);
      if (t) return sub === 'soan' ? this.studio(root, t, query) : this.type(root, t);
    }
    const focus = types.filter(t => U.isOn(t.focus) && String(t.focus).trim());
    const rest = types.filter(t => !focus.includes(t));
    const ideas = Store.content.mediaideas || [];
    const row = t => `<li><a href="#/truyenthong/${U.esc(t.id)}">
      <span class="mt-name"><span class="zh">${U.esc(t.name_zh)}</span><span class="muted">${U.esc(t.name_vi)}</span></span>
      <span class="item-meta">${String(t.platform || '').split(/[、,，]/).filter(Boolean).map(p => `<span class="tag zh">${U.esc(p.trim())}</span>`).join('')}
        <span class="tag">${U.num(t.duration_sec)}s</span><span class="muted small">${ideas.filter(i => i.type === t.id).length} ý tưởng</span></span></a></li>`;
    root.innerHTML = `
      <header class="page-head"><h1>Truyền thông cá nhân</h1>
        <p>Soạn và luyện nói kịch bản video ngắn cho 抖音 và 小红书. Mỗi loại nội dung có cấu trúc khối riêng, kịch bản mẫu và kho ý tưởng. Soạn xong thì đọc với máy nhắc chữ rồi tự chấm.</p></header>
      ${focus.length ? `<section class="section" style="padding-top:0"><h2>Trọng tâm</h2><ul class="mt-list">${focus.map(row).join('')}</ul></section>` : ''}
      ${rest.length ? `<section class="section"><h2>Các dạng khác</h2><ul class="mt-list">${rest.map(row).join('')}</ul></section>` : ''}
      ${!types.length ? '<div class="empty">Tab MediaTypes trên Sheet chưa có loại nội dung nào.</div>' : ''}`;
  },

  type(root, t) {
    const blocks = U.lines(t.blocks).map(U.splitStep);
    const order = blocks.map(b => b.name);
    const ideas = (Store.content.mediaideas || []).filter(i => i.type === t.id);
    root.innerHTML = `
      <a class="back" href="#/truyenthong">Các loại nội dung</a>
      <div class="lib-title"><h1 class="zh">${U.esc(t.name_zh)}</h1><p>${U.esc(t.name_vi)}</p></div>
      <p class="def">${U.esc(t.goal)}</p>
      <div class="row" style="margin-top:14px"><a class="btn btn-primary" href="#/truyenthong/${U.esc(t.id)}/soan">Soạn kịch bản mới</a>
        <span class="muted small">Mục tiêu khoảng ${U.num(t.duration_sec)} giây</span></div>
      <section class="section" style="margin-top:18px"><h2>Cấu trúc kịch bản</h2>
        <ol class="steps">${blocks.map((b, i) => `<li><span class="step-name zh mk mk-${i % 6}">${U.esc(b.label)}</span><span class="zh">${U.esc(b.desc)}</span></li>`).join('')}</ol></section>
      <section class="section"><div class="sample-tools"><h2>Kịch bản mẫu</h2><button type="button" class="btn btn-sm" id="tp">Đọc với máy nhắc chữ</button></div>
        ${U.legend(t.sample, order)}
        <div class="sample-box" style="margin-top:10px"><p class="${U.richClass()}">${U.rich(t.sample, { order })}</p></div>
        <p class="small muted" style="margin-top:8px">${U.count(t.sample).han} chữ, khoảng ${U.fmtTime(U.duration(t.sample, this.rateDef()))} ở ${this.rateDef()} chữ/phút.</p></section>
      <section class="section"><h2>Mẹo</h2><ul class="tips">${U.lines(t.tips).map(x => `<li>${U.esc(x)}</li>`).join('')}</ul></section>
      <section class="section"><h2>Ý tưởng (${ideas.length})</h2>
        ${ideas.length ? `<ul class="item-list">${ideas.map(i => `<li><a href="#/truyenthong/${U.esc(t.id)}/soan?idea=${U.esc(i.id)}">
          <span class="item-id">${U.esc(i.id)}</span><span><span class="item-title zh">${U.esc(i.title)}</span><span class="item-sub">${U.esc(i.angle)}</span></span>
          <span class="item-meta">${Store.marks('media').has(i.id) ? '<span class="done-mark">Đã làm</span>' : ''}<span class="link-like">Soạn từ ý tưởng này</span></span></a></li>`).join('')}</ul>`
          : '<p class="muted">Chưa có ý tưởng cho loại này. Thêm ở tab MediaIdeas, hoặc dùng prompt trong docs/PROMPTS.md.</p>'}</section>`;
    root.querySelector('#tp').addEventListener('click', () => UI.teleprompter(U.stripMarks(t.sample), { rate: this.rateDef() }));
  },

  studio(root, t, query) {
    const idea = query.idea ? Store.find('mediaideas', query.idea) : null;
    const blocks = U.lines(t.blocks).map(U.splitStep);
    const key = `media.${t.id}.${idea ? idea.id : 'trong'}`;
    const d = Object.assign({ parts: {}, rate: this.rateDef(), sec: 0, runs: 0 }, Store.draft(key));
    const target = U.num(t.duration_sec, 60);
    const ph = Store.content.phrases || [];
    const byCat = prefix => ph.filter(p => String(p.category || '').startsWith(prefix));

    root.innerHTML = `
      <a class="back" href="#/truyenthong/${U.esc(t.id)}">${U.esc(t.name_zh)}</a>
      <h1 class="h-zh">${idea ? U.esc(idea.title) : 'Kịch bản mới'}</h1>
      <p class="muted">${U.esc(t.name_vi)}${idea && idea.angle ? `. Góc khai thác: ${U.esc(idea.angle)}` : ''}</p>
      <div class="ws" style="margin-top:18px">
        <form class="stack" id="blocks" autocomplete="off">
          ${blocks.map((b, i) => `<div class="blk"><label for="b${i}"><span class="step-name zh mk mk-${i % 6}">${U.esc(b.label)}</span>
            <span class="blk-est small muted" data-est="${i}"></span></label>
            <textarea class="field zh" id="b${i}" data-name="${U.esc(b.name)}" rows="${i === 0 ? 2 : 3}" placeholder="${U.esc(b.desc)}"></textarea></div>`).join('')}
          <div class="row"><button type="button" class="btn" id="copy">Sao chép kịch bản</button><span class="spacer"></span>
            <button type="button" class="btn" id="tp">Đọc với máy nhắc chữ</button><button type="button" class="btn btn-primary" id="save">Tự chấm và lưu</button></div>
        </form>
        <aside class="ws-side">
          <div class="side-block meter">
            <h3>Thời lượng ước tính</h3>
            <div class="meter-num" id="dur"></div>
            <div class="meter-bar" id="durbar"><i></i></div>
            <label class="small" style="margin-top:8px">Tốc độ nói<select id="rate">${[180, 200, 230, 260, 280].map(r => `<option value="${r}" ${r === Number(d.rate) ? 'selected' : ''}>${r} chữ/phút${r === 230 ? ' (chuẩn)' : ''}</option>`).join('')}</select></label>
            <p class="small muted" id="runs"></p>
          </div>
          ${idea ? `<div class="side-block"><h3>Ý tưởng</h3>
            ${U.lines(idea.hooks).length ? `<p class="sugg-title">Câu mở gợi ý</p>${UI.phraseButtons(U.lines(idea.hooks).map(h => ({ zh: h, vi: 'Chèn câu mở' })))}` : ''}
            ${U.lines(idea.points).length ? `<p class="sugg-title" style="margin-top:10px">Ý chính</p><ul class="tips small">${U.lines(idea.points).map(p => `<li class="zh">${U.esc(p)}</li>`).join('')}</ul>` : ''}
            ${idea.cta ? `<p class="sugg-title" style="margin-top:10px">Lời kêu gọi</p>${UI.phraseButtons([{ zh: idea.cta, vi: 'Chèn lời kêu gọi' }])}` : ''}</div>` : ''}
          <div class="side-block"><p class="sugg-title" id="sg-title"></p><div id="sg"></div></div>
        </aside>
      </div>`;

    const form = root.querySelector('#blocks');
    const tas = [...form.querySelectorAll('textarea')];
    tas.forEach(ta => { ta.value = d.parts[ta.dataset.name] || ''; });
    let focusEl = tas[0], focusIdx = 0;

    const script = (tagged) => tas.filter(ta => ta.value.trim()).map(ta => tagged ? `【${ta.dataset.name}】${ta.value.trim()}【/${ta.dataset.name}】` : ta.value.trim()).join('\n');
    const draw = () => {
      const rate = Number(d.rate), plain = script(false), sec = U.duration(plain, rate);
      root.querySelector('#dur').innerHTML = `${U.fmtTime(sec)} <small>/ mục tiêu ${U.fmtTime(target)}, ${U.count(plain).han} chữ</small>`;
      const bar = root.querySelector('#durbar');
      bar.querySelector('i').style.width = Math.min(100, sec / target * 100) + '%';
      bar.classList.toggle('over', sec > target * 1.15);
      tas.forEach((ta, i) => { const s = U.duration(ta.value, rate); root.querySelector(`[data-est="${i}"]`).textContent = ta.value.trim() ? `≈ ${s}s` : ''; });
      root.querySelector('#runs').textContent = d.runs ? `Đã luyện với máy nhắc chữ ${d.runs} lần, lần gần nhất ${U.fmtTime(d.sec)}.` : 'Chưa luyện với máy nhắc chữ.';
    };
    const persist = U.debounce(() => { tas.forEach(ta => { d.parts[ta.dataset.name] = ta.value; }); Store.saveDraft(key, d); }, 300);
    form.addEventListener('input', () => { draw(); persist(); });
    root.querySelector('#rate').addEventListener('change', e => { d.rate = Number(e.target.value); draw(); persist(); });

    const sugg = () => {
      let title, list;
      if (focusIdx === 0) { title = 'Gợi ý câu mở video'; list = byCat('视频开场钩子'); }
      else if (focusIdx === tas.length - 1) { title = 'Gợi ý kết và kêu gọi'; list = [...byCat('视频互动引导'), ...(t.id === 'kecheng' ? byCat('课程推荐') : [])]; }
      else if (t.id === 'kecheng') { title = 'Gợi ý giới thiệu khoá học'; list = byCat('课程推荐'); }
      else if (t.id === 'wenhua' || t.id === 'vlog') { title = 'Gợi ý kể chuyện, so sánh văn hoá'; list = [...byCat('讲故事'), ...byCat('文化对比')]; }
      else { title = 'Gợi ý diễn đạt tự nhiên'; list = [...byCat('举例说明'), ...byCat('口语地道表达')]; }
      root.querySelector('#sg-title').textContent = title;
      root.querySelector('#sg').innerHTML = UI.phraseButtons(list);
    };
    form.addEventListener('focusin', e => { if (e.target.tagName === 'TEXTAREA') { focusEl = e.target; focusIdx = tas.indexOf(e.target); sugg(); } });
    root.querySelector('.ws-side').addEventListener('mousedown', e => { if (e.target.closest('[data-insert]')) e.preventDefault(); });
    root.querySelector('.ws-side').addEventListener('click', e => {
      const b = e.target.closest('[data-insert]'); if (!b) return;
      // Câu mở → khối đầu; lời kêu gọi → khối cuối; còn lại chèn vào ô đang soạn
      const tgt = b.title === 'Chèn câu mở' ? tas[0] : b.title === 'Chèn lời kêu gọi' ? tas[tas.length - 1] : focusEl;
      UI.insertInto(tgt, b.dataset.insert);
    });
    root.querySelector('#copy').addEventListener('click', async () => {
      const text = tas.filter(ta => ta.value.trim()).map(ta => ta.value.trim()).join('\n\n');
      if (!text) return UI.toast('Kịch bản đang trống.', 'bad');
      try { await navigator.clipboard.writeText(text); UI.toast('Đã sao chép kịch bản.'); } catch (e) { UI.toast('Trình duyệt chặn sao chép; hãy chọn và sao chép thủ công.', 'bad'); }
    });
    root.querySelector('#tp').addEventListener('click', async () => {
      const text = tas.filter(ta => ta.value.trim()).map(ta => ta.value.trim()).join('\n\n');
      if (!text) return UI.toast('Kịch bản đang trống.', 'bad');
      const r = await UI.teleprompter(text, { rate: Number(d.rate) });
      if (r.sec > 3) { d.sec = r.sec; d.runs = (d.runs || 0) + 1; persist(); draw(); }
    });
    root.querySelector('#save').addEventListener('click', async () => {
      const content = script(true);
      if (!U.count(content).han) return UI.toast('Kịch bản đang trống.', 'bad');
      const plain = script(false);
      const here = location.hash;
        const ok = await UI.saveSpeaking({ scope: 'media', type: 'media', refId: idea ? idea.id : t.id, title: `${t.name_zh}: ${idea ? idea.title : 'tự chọn'}`, content, speakSec: d.sec,
        data: { type: t.id, idea: idea ? idea.id : '', estSec: U.duration(plain, Number(d.rate)), targetSec: target, runs: d.runs || 0 },
        intro: `Ước tính ${U.fmtTime(U.duration(plain, Number(d.rate)))} (mục tiêu ${U.fmtTime(target)}), đã luyện ${d.runs || 0} lần với máy nhắc chữ.` });
      if (ok) { Store.clearDraft(key); if (idea) Store.addMark('media', idea.id); if (location.hash === here) location.hash = '#/truyenthong/' + t.id; }
    });
    sugg(); draw();
  }
};
