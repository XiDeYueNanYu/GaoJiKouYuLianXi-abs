/* Module 2: So sánh hai câu trả lời. #/sosanh  |  #/sosanh?id=S003 */
window.Modules = window.Modules || {};
Modules.sosanh = {
  st: null,
  render(root, arg, query) {
    const items = Store.content.compare || [];
    const crit = (Store.content.rubric || []).filter(c => c.scope === 'core');
    if (!this.st) this.st = { done: 0, right: 0 };
    const st = this.st; st.crit = crit;
    root.innerHTML = `
      <header class="page-head"><h1>So sánh câu trả lời</h1>
        <p>Đọc hai câu trả lời cho cùng một câu hỏi. Chọn câu tốt hơn và những tiêu chí làm nên khác biệt, rồi xem phân tích. Đây là cách luyện “con mắt giám khảo”.</p></header>
      <div class="quiz-head"><span class="spacer"></span><span class="score" id="score"></span></div>
      <div id="card"></div>`;
    if (!items.length) { root.querySelector('#card').innerHTML = '<div class="empty">Tab Compare trên Sheet chưa có cặp nào.</div>'; return; }
    const seen = Store.marks('compare');
    st.queue = [...U.shuffle(items.filter(x => !seen.has(x.id))), ...U.shuffle(items.filter(x => seen.has(x.id)))];
    if (query.id) { const it = items.find(x => x.id === query.id); if (it) st.queue.unshift(it); }
    this.next(root);
  },
  next(root) {
    const st = this.st;
    if (!st.queue.length) this.render(root, '', {});
    st.item = st.queue.shift(); st.flip = Math.random() < 0.5; st.pick = ''; st.why = new Set(); st.checked = false;
    this.draw(root);
  },
  draw(root) {
    const st = this.st, it = st.item;
    root.querySelector('#score').innerHTML = st.done ? `Phiên này: <b>${st.right}</b> / ${st.done} lần chọn đúng` : '';
    // Hiển thị: bên trái là "1", bên phải là "2"; flip đảo vị trí A/B
    const shown = st.flip ? [['B', it.answer_b], ['A', it.answer_a]] : [['A', it.answer_a], ['B', it.answer_b]];
    const better = String(it.better).trim().toUpperCase();
    const ansCrit = String(it.criteria || '').split(/[,，\s]+/).filter(Boolean);
    const card = root.querySelector('#card');
    card.innerHTML = `
      <div class="panel"><p class="muted small">Câu hỏi ${U.esc(it.id)}</p><p class="q-big ${U.richClass()}">${U.rich(it.question, { marks: false })}</p></div>
      <div class="pair">${shown.map(([key, text], i) => {
        let cls = '';
        if (st.checked) cls = key === better ? 'is-right' : (st.pick === key ? 'is-wrong' : '');
        return `<button type="button" class="ans ${cls}" data-key="${key}" aria-pressed="${st.pick === key}" ${st.checked ? 'disabled' : ''}>
          <span class="ans-label">Câu trả lời ${i + 1}${st.checked && key === better ? ' (tốt hơn)' : ''}</span>
          <span class="${U.richClass()}">${U.rich(text, { marks: false })}</span></button>`;
      }).join('')}</div>
      <div class="why"><p class="small" style="font-weight:500;margin-bottom:8px">Câu tốt hơn vượt trội ở tiêu chí nào? (chọn một hoặc nhiều)</p>
        <div class="sugg">${st.crit.map(c => {
          let cls = '';
          if (st.checked) cls = ansCrit.includes(c.id) ? (st.why.has(c.id) ? 'chip-right' : 'chip-missed') : (st.why.has(c.id) ? 'chip-wrong' : '');
          return `<button type="button" class="chip ${cls}" data-c="${U.esc(c.id)}" aria-pressed="${st.why.has(c.id)}" ${st.checked ? 'disabled' : ''}><b class="zh">${U.esc(c.name_zh)}</b> ${U.esc(c.name_vi)}</button>`;
        }).join('')}</div></div>
      ${st.checked ? `<div class="feedback ${st.lastRight ? '' : 'bad'}">
        <h3>${st.lastRight ? 'Chọn đúng câu tốt hơn.' : 'Chưa đúng: câu tốt hơn là câu bên kia.'} Tiêu chí khác biệt: ${ansCrit.map(id => U.esc((st.crit.find(c => c.id === id) || {}).name_zh || id)).join('、')}</h3>
        <p>${U.esc(it.analysis)}</p></div>` : ''}
      <div class="row" style="margin-top:18px">${st.checked ? '<button type="button" class="btn btn-primary" id="next">Cặp tiếp theo</button>' : `<button type="button" class="btn btn-primary" id="check" ${st.pick ? '' : 'disabled'}>Kiểm tra</button>`}</div>`;
    card.querySelectorAll('.ans').forEach(b => b.addEventListener('click', () => { st.pick = b.dataset.key; this.draw(root); }));
    card.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.c; st.why.has(id) ? st.why.delete(id) : st.why.add(id); b.setAttribute('aria-pressed', String(st.why.has(id)));
    }));
    const chk = card.querySelector('#check');
    chk && chk.addEventListener('click', () => {
      st.checked = true; st.lastRight = st.pick === better; st.done++; if (st.lastRight) st.right++;
      Store.addMark('compare', it.id);
      Api.call('logAttempt', { itemId: it.id, chosen: [st.pick, ...st.why], answer: [better, ...ansCrit], correct: st.lastRight }).catch(e => UI.toast('Chưa ghi được kết quả: ' + e.message, 'bad'));
      Store.setHistory(null);
      this.draw(root);
    });
    const nx = card.querySelector('#next'); nx && nx.addEventListener('click', () => this.next(root));
  }
};
