/* Lịch sử: điểm tự chấm theo tiêu chí, tốc độ nói, so sánh, bài đã lưu. #/lichsu */
window.Modules = window.Modules || {};
Modules.lichsu = {
  TYPE_VI: { quick: 'Phản xạ', material: 'Tài liệu', opinion: 'Quan điểm', interp: 'Dịch nói', media: 'Video' },
  filter: '',
  async render(root) {
    root.innerHTML = `<header class="page-head"><h1>Lịch sử luyện tập</h1><p>Lấy từ Google Sheet: điểm tự chấm theo từng tiêu chí, tốc độ nói và các bài đã lưu.</p></header><div id="h"><p class="loading">Đang tải lịch sử…</p></div>`;
    const body = root.querySelector('#h');
    let h = Store.history;
    if (!h) {
      try { h = await Api.call('getHistory'); Store.setHistory(h); }
      catch (err) { body.innerHTML = UI.errorBox(err, 'Thử lại'); body.querySelector('[data-retry]').addEventListener('click', () => this.render(root)); return; }
    }
    if (body.isConnected) this.draw(body, h);
  },

  draw(body, h) {
    const subs = h.submissions || [];
    const crit = Store.content.rubric || [];
    const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null;
    const stats = crit.map(c => {
      const all = subs.filter(s => s.scores && s.scores[c.id] != null).map(s => Number(s.scores[c.id]));
      const ai = subs.filter(s => s.aiScores && s.aiScores[c.id] != null).map(s => Number(s.aiScores[c.id])).filter(Boolean);
      return { c, n: all.length, all: avg(all), recent: avg(all.slice(0, 5)), first: avg(all.slice(-5)), ai: avg(ai), nAi: ai.length };
    }).filter(x => x.n || x.nAi);
    const rated = subs.filter(s => U.num(s.rate) > 0);
    const types = Object.keys(this.TYPE_VI);
    const cmp = h.attempts || [];
    const cmpRight = cmp.filter(a => a.correct).length;

    body.innerHTML = `
      <section class="section" style="padding-top:0"><h2>Điểm tự chấm theo tiêu chí</h2>
        ${stats.length ? `<div class="table-wrap"><table class="stat-table"><thead><tr><th>Tiêu chí</th><th style="width:34%">Trung bình (thang 5)</th><th class="num">5 bài gần nhất</th><th class="num">5 bài đầu</th><th class="num">AI chấm (TB)</th><th class="num">Số bài</th></tr></thead><tbody>
          ${stats.map(x => `<tr><td><span class="zh">${U.esc(x.c.name_zh)}</span> <span class="muted small">${U.esc(x.c.name_vi)}</span></td>
            <td>${x.n ? `<div class="bar" title="${x.all}"><i style="width:${x.all / 5 * 100}%"></i></div>` : '<span class="muted small">Chưa tự chấm</span>'}</td>
            <td class="num">${x.n ? x.recent + (x.recent > x.first && x.n > 5 ? ' ↑' : '') : ''}</td><td class="num">${x.n ? x.first : ''}</td>
            <td class="num">${x.nAi ? x.ai + (x.n && Math.abs(x.all - x.ai) >= 1 ? (x.all > x.ai ? ' <span class="small muted">(bạn chấm cao hơn)</span>' : ' <span class="small muted">(bạn chấm thấp hơn)</span>') : '') : ''}</td><td class="num">${x.n}</td></tr>`).join('')}
        </tbody></table></div>
        ${(() => { const w = stats.filter(x => x.c.scope === 'core' && x.n).sort((a, b) => a.recent - b.recent)[0]; return w ? `<p class="small" style="margin-top:10px">Tiêu chí cần ưu tiên: <b class="zh">${U.esc(w.c.name_zh)}</b> (${U.esc(w.c.name_vi)}).</p>` : ''; })()}`
        : '<div class="empty">Chưa có bài nào được tự chấm.</div>'}
      </section>
      <section class="section"><h2>Tốc độ nói</h2>
        ${rated.length ? `<div class="table-wrap"><table class="stat-table"><thead><tr><th>Phần luyện</th><th class="num">Trung bình (chữ/phút)</th><th class="num">Số bài</th></tr></thead><tbody>
          ${types.map(ty => { const r = rated.filter(s => s.type === ty).map(s => U.num(s.rate)); return r.length ? `<tr><td>${this.TYPE_VI[ty]}</td><td class="num">${Math.round(avg(r))}</td><td class="num">${r.length}</td></tr>` : ''; }).join('')}
        </tbody></table></div><p class="small muted" style="margin-top:6px">Người bản ngữ nói chuyện thường khoảng 200–260 chữ/phút. Chỉ tính các bài có ghi lại lời nói.</p>`
        : '<div class="empty">Chưa có bài nào ghi lại lời nói để tính tốc độ.</div>'}
      </section>
      <section class="section"><h2>So sánh câu trả lời</h2>
        ${cmp.length ? `<p>${cmp.length} lượt, chọn đúng câu tốt hơn ${cmpRight} lượt (${Math.round(cmpRight / cmp.length * 100)}%).</p>` : '<div class="empty">Chưa làm bài so sánh nào. <a href="#/sosanh">Bắt đầu</a>.</div>'}
      </section>
      <section class="section">
        <div class="row" style="margin-bottom:12px"><h2>Bài đã lưu</h2><span class="spacer"></span>
          <div class="sugg" id="f">${[['', 'Tất cả'], ...types.map(t => [t, this.TYPE_VI[t]])].map(([v, l]) => `<button type="button" class="chip" data-type="${v}" aria-pressed="${this.filter === v}">${l}</button>`).join('')}</div></div>
        <ul class="sub-list" id="list"></ul>
      </section>`;
    const drawList = () => {
      const list = subs.filter(s => !this.filter || s.type === this.filter);
      body.querySelector('#list').innerHTML = list.length ? list.map(s => `<li><button type="button" data-id="${U.esc(s.id)}">
        <span class="sub-meta">${U.esc(U.fmtDate(s.createdAt))}</span><span class="tag">${U.esc(this.TYPE_VI[s.type] || s.type)}</span>
        <span class="sub-title zh">${U.esc(s.title || '')}</span>
        <span class="sub-meta">${s.speakSec ? U.fmtTime(s.speakSec) : ''}${U.num(s.rate) ? `, ${s.rate} chữ/phút` : ''}${s.avgScore !== '' && s.avgScore != null ? `, điểm ${s.avgScore}` : ''}</span></button></li>`).join('') : '<li class="empty">Chưa có bài nào.</li>';
    };
    body.querySelector('#f').addEventListener('click', e => {
      const b = e.target.closest('[data-type]'); if (!b) return;
      this.filter = b.dataset.type; body.querySelectorAll('#f .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); drawList();
    });
    body.querySelector('#list').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) this.open(subs.find(s => s.id === b.dataset.id)); });
    drawList();
  },

  open(s) {
    if (!s) return;
    const crit = Store.content.rubric || [];
    const sc = Object.entries(s.scores || {});
    const missed = U.lines(s.checklistMissed);
    UI.modal({
      title: s.title || 'Bài đã lưu', wide: true,
      body: `<p class="muted small" style="margin-bottom:12px">${U.esc(this.TYPE_VI[s.type] || s.type)}, ${U.esc(U.fmtDate(s.createdAt))}${s.speakSec ? `, nói ${U.fmtTime(s.speakSec)}` : ''}${U.num(s.rate) ? `, ${s.rate} chữ/phút` : ''}</p>
        ${sc.length ? `<div class="sugg" style="margin-bottom:12px">${sc.map(([k, v]) => `<span class="chip"><b class="zh">${U.esc((crit.find(c => c.id === k) || {}).name_zh || k)}</b> ${v}/5</span>`).join('')}</div>` : ''}
        ${U.legend(s.content)}
        <div class="sample-box" style="margin-top:8px"><p class="rich">${U.rich(s.content, { pinyin: false })}</p></div>
        ${s.notes ? `<p style="margin-top:12px"><b>Ý chính đã chuẩn bị:</b></p><p class="zh pre">${U.esc(s.notes)}</p>` : ''}
        ${missed.length ? `<p style="margin-top:12px;font-weight:500">Checklist chưa đạt</p><ul class="tips">${missed.map(m => `<li>${U.esc(m)}</li>`).join('')}</ul>` : ''}
        ${s.note ? `<p style="margin-top:12px"><b>Ghi chú:</b> ${U.esc(s.note)}</p>` : ''}
        ${(() => { let list = []; try { list = s.aiFeedback ? JSON.parse(s.aiFeedback) : []; } catch (e) { list = []; }
          return Array.isArray(list) && list.length ? `<h3 style="margin-top:18px">Nhận xét của AI</h3>${list.map((a, i) => (list.length > 1 ? `<p class="small muted" style="margin-top:10px">Lượt ${i + 1}</p>` : '') + AI.panel(a)).join('')}` : ''; })()}
        <p class="small muted" style="margin-top:14px">Muốn nhận xét chi tiết: sao chép phần lời nói và dùng prompt “Nhận xét bài nói” trong docs/PROMPTS.md.</p>`,
      actions: [{ label: 'Sao chép lời nói', value: () => { navigator.clipboard && navigator.clipboard.writeText(U.stripMarks(s.content)).then(() => UI.toast('Đã sao chép.')).catch(() => {}); return false; } }, { label: 'Đóng', kind: 'primary', value: null }]
    });
  }
};
