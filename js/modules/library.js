/* Module 1: Thư viện khung biểu đạt, mẫu câu, thang chấm. #/thuvien/<mã khung> | tu-mau | thang-cham */
window.Modules = window.Modules || {};
Modules.thuvien = {
  render(root, arg) {
    const frames = Store.content.frames || [];
    const cur = arg || (frames[0] && frames[0].id);
    root.innerHTML = `
      <header class="page-head"><h1>Thư viện biểu đạt</h1>
        <p>Các khung trả lời dùng chung cho thi nói và cho video. Mỗi khung có các bước, mẫu câu và một câu trả lời mẫu được gạch chân theo từng bước.</p></header>
      <nav class="subnav" aria-label="Chọn mục">
        ${frames.map(f => `<a href="#/thuvien/${U.esc(f.id)}" ${f.id === cur ? 'aria-current="page"' : ''}><span class="chip zh">${U.esc(f.name_zh)}</span></a>`).join('')}
        <a href="#/thuvien/tu-mau" ${cur === 'tu-mau' ? 'aria-current="page"' : ''}><span class="chip">Kho mẫu câu</span></a>
        <a href="#/thuvien/thang-cham" ${cur === 'thang-cham' ? 'aria-current="page"' : ''}><span class="chip">Thang tự chấm</span></a>
      </nav>
      <div id="lib"></div>`;
    const body = root.querySelector('#lib');
    if (cur === 'tu-mau') return this.phrases(body);
    if (cur === 'thang-cham') return this.rubric(body);
    const f = Store.find('frames', cur);
    if (!f) { body.innerHTML = `<div class="empty">Không tìm thấy khung “${U.esc(cur)}”.</div>`; return; }
    this.frame(body, f);
  },

  frame(body, f) {
    const steps = U.lines(f.steps).map(U.splitStep);
    const order = steps.map(s => s.name);
    const related = (Store.content.phrases || []).filter(p => p.frame === f.id);
    body.innerHTML = `
      <div class="lib-title"><h1 class="zh">${U.esc(f.name_zh)}</h1><p>${U.esc(f.name_vi)}</p></div>
      ${f.use_for ? `<p class="muted" style="margin-top:6px">Dùng cho: ${U.esc(f.use_for)}</p>` : ''}
      <section class="section" style="margin-top:18px"><h2>Các bước</h2>
        <ol class="steps">${steps.map((s, i) => `<li><span class="step-name zh mk mk-${i % 6}">${U.esc(s.label)}</span><span>${U.esc(s.desc)}</span></li>`).join('')}</ol>
      </section>
      ${f.phrases ? `<section class="section"><h2>Mẫu câu của khung</h2><ul class="frame-ph">${U.lines(f.phrases).map(p => `<li class="${U.richClass()}">${U.rich(p, { marks: false })}</li>`).join('')}</ul></section>` : ''}
      <section class="section">
        <div class="sample-tools"><h2>Câu trả lời mẫu</h2>
          <div class="row"><label class="switch small"><input type="checkbox" id="tg-marks" checked><span>Hiện gạch chân</span></label>
          <button type="button" class="btn btn-sm" id="tp">Đọc với máy nhắc chữ</button></div></div>
        ${U.legend(f.example, order)}
        <div class="sample-box" style="margin-top:10px"><p class="${U.richClass()}" id="ex">${U.rich(f.example, { order })}</p></div>
        <p class="small muted" style="margin-top:8px">${U.count(f.example).han} chữ, đọc ở tốc độ ${U.num(Store.cfg('speaking_rate', 230), 230)} chữ/phút mất khoảng ${U.fmtTime(U.duration(f.example, U.num(Store.cfg('speaking_rate', 230), 230)))}.</p>
      </section>
      ${related.length ? `<section class="section"><h2>Mẫu câu liên quan trong kho</h2>${this.phraseList(related)}</section>` : ''}`;
    body.querySelector('#tg-marks').addEventListener('change', e => body.querySelector('#ex').classList.toggle('no-marks', !e.target.checked));
    body.querySelector('#tp').addEventListener('click', () => UI.teleprompter(U.stripMarks(f.example), { rate: U.num(Store.cfg('speaking_rate', 230), 230) }));
  },

  phraseList(list) {
    return `<ul class="phrase-list">${list.map(p => `
      <li><div><div class="phrase-zh">${U.esc(p.zh)}</div>${Store.prefs.pinyin ? `<div class="phrase-py">${U.esc(U.pinyinOf(p.zh))}</div>` : ''}</div>
        <div>${U.esc(p.vi)}</div>${p.example ? `<div class="phrase-ex">${U.esc(p.example)}</div>` : ''}</li>`).join('')}</ul>`;
  },

  phrases(body) {
    const all = Store.content.phrases || [];
    const cats = [...new Set(all.map(p => p.category || 'Khác'))];
    let cat = '', q = '';
    body.innerHTML = `
      <div class="row" style="margin-bottom:12px"><input type="search" id="q" placeholder="Tìm theo chữ Hán, nghĩa hoặc nhóm" style="max-width:360px"><span class="muted small" id="n"></span></div>
      <div class="subnav" id="cats"><button type="button" class="chip" data-cat="" aria-pressed="true">Tất cả</button>
        ${cats.map(c => `<button type="button" class="chip" data-cat="${U.esc(c)}" aria-pressed="false">${U.esc(c)}</button>`).join('')}</div>
      <div id="list"></div>`;
    const draw = () => {
      const qq = q.trim().toLowerCase();
      const list = all.filter(p => (!cat || (p.category || 'Khác') === cat) && (!qq || [p.zh, p.vi, p.example, p.category].some(v => String(v || '').toLowerCase().includes(qq))));
      body.querySelector('#n').textContent = `${list.length} mục`;
      const groups = cats.map(c => [c, list.filter(p => (p.category || 'Khác') === c)]).filter(([, l]) => l.length);
      body.querySelector('#list').innerHTML = groups.length ? groups.map(([c, l]) => `<h3 class="cat-head">${U.esc(c)}</h3>${this.phraseList(l)}`).join('') : '<div class="empty">Không có mẫu câu nào khớp.</div>';
    };
    body.querySelector('#q').addEventListener('input', U.debounce(e => { q = e.target.value; draw(); }, 150));
    body.querySelector('#cats').addEventListener('click', e => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      cat = b.dataset.cat; body.querySelectorAll('#cats .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw();
    });
    draw();
  },

  rubric(body) {
    const r = Store.content.rubric || [];
    const block = (title, list) => `<section class="section"><h2>${title}</h2>
      <div class="table-wrap"><table class="rubric-table"><thead><tr><th>Tiêu chí</th><th>Mức 1</th><th>Mức 3</th><th>Mức 5</th></tr></thead><tbody>
      ${list.map(c => `<tr><th scope="row"><span class="zh">${U.esc(c.name_zh)}</span><br><span class="muted small">${U.esc(c.name_vi)}</span></th><td>${U.esc(c.desc_1)}</td><td>${U.esc(c.desc_3)}</td><td>${U.esc(c.desc_5)}</td></tr>`).join('')}
      </tbody></table></div></section>`;
    body.innerHTML = `<p class="muted" style="max-width:72ch">Bốn tiêu chí chung phỏng theo cách chấm nói của IELTS, dùng cho mọi phần luyện. Ba tiêu chí riêng chỉ dùng cho kịch bản video. Mức 2 và 4 nằm giữa các mức mô tả.</p>
      ${block('Tiêu chí chung', r.filter(c => c.scope === 'core'))}${r.some(c => c.scope === 'media') ? block('Tiêu chí riêng cho video', r.filter(c => c.scope === 'media')) : ''}`;
  }
};
