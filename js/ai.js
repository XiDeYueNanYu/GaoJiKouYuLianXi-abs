/* Ghi âm trên trình duyệt (không lưu lại ở đâu) và gửi đi cho AI phân tích. */
const Rec = (() => {
  const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/aac'];
  const pick = () => TYPES.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && window.isSecureContext !== false);

  /** Một máy ghi: prepare() xin quyền micro, start() bắt đầu, stop() trả về { blob, mime, sec }. */
  function create() {
    let stream = null, mr = null, chunks = [], t0 = 0;
    return {
      async prepare() {
        if (!stream) stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      },
      async start() {
        await this.prepare();
        chunks = [];
        const mime = pick();
        mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : {});
        mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        mr.start(1000); t0 = Date.now();
      },
      stop() {
        return new Promise(resolve => {
          if (!mr || mr.state === 'inactive') { this.release(); return resolve(null); }
          mr.onstop = () => {
            const type = mr.mimeType || pick() || 'audio/webm';
            const blob = new Blob(chunks, { type });
            this.release();
            resolve(blob.size ? { blob, mime: type, sec: Math.round((Date.now() - t0) / 1000) } : null);
          };
          mr.stop();
        });
      },
      release() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } },
      get active() { return !!mr && mr.state === 'recording'; }
    };
  }
  const toBase64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });
  return { supported, create, toBase64 };
})();

const AI = (() => {
  const status = () => (Store.content && Store.content.ai) || { enabled: false };
  const available = () => status().enabled && Rec.supported();
  const left = () => Math.max(0, U.num(status().limit) - U.num(status().used));

  /** Gửi bản ghi âm lên Apps Script → Gemini. Trả về analysis. */
  async function analyze(rec, scope, context, sec) {
    if (!rec) throw new ApiError('NO_AUDIO', 'Chưa có bản ghi âm cho lượt này.');
    const max = U.num(status().maxSec, 300);
    if (rec.sec > max + 5) throw new ApiError('TOO_LONG', `Bản ghi dài ${U.fmtTime(rec.sec)}, quá giới hạn ${U.fmtTime(max)} cho một lần phân tích.`);
    const audio = await Rec.toBase64(rec.blob);
    const r = await Api.call('analyzeAudio', { scope, mime: rec.mime, sec: sec || rec.sec, audio, context });
    const c = Store.content;
    c.ai = Object.assign({}, c.ai, { used: r.used, limit: r.limit });
    Store.setContent(c);
    return Object.assign(r.analysis, { model: r.model, at: new Date().toISOString() });
  }

  /** Điểm AI trung bình theo tiêu chí từ nhiều lượt (bỏ qua điểm 0 = không chấm được). */
  function avgScores(list) {
    const sum = {}, n = {};
    (list || []).filter(Boolean).forEach(a => Object.entries(a.scores || {}).forEach(([k, v]) => {
      v = Number(v); if (!v) return; sum[k] = (sum[k] || 0) + v; n[k] = (n[k] || 0) + 1;
    }));
    const out = {}; Object.keys(sum).forEach(k => { out[k] = Math.round(sum[k] / n[k] * 10) / 10; });
    return out;
  }

  /** Bản gọn để lưu vào Sheet. */
  const compact = list => (list || []).filter(Boolean).map(a => ({
    summary: a.summary, scores: a.scores, comments: a.comments, pronunciation: a.pronunciation, errors: a.errors, extra: a.extra, improved: a.improved, model: a.model
  }));

  function panel(a, { withUse = false } = {}) {
    if (!a) return '';
    const crit = Store.content.rubric || [];
    const name = id => { const c = crit.find(x => x.id === id); return c ? c.name_zh : id; };
    const sc = Object.entries(a.scores || {});
    const silent = sc.length && sc.every(([, v]) => !Number(v));
    return `<div class="ai-res">
      <div class="row"><b>Nhận xét của AI</b><span class="spacer"></span>${a.model ? `<span class="small muted">${U.esc(a.model)}</span>` : ''}</div>
      ${a.summary ? `<p>${U.esc(a.summary)}</p>` : ''}
      ${sc.length && !silent ? `<div class="sugg">${sc.map(([k, v]) => `<span class="chip ai-score" title="${U.esc((a.comments || {})[k] || '')}"><b class="zh">${U.esc(name(k))}</b> ${v}/5</span>`).join('')}</div>` : ''}
      ${withUse && a.transcript ? `<p><button type="button" class="btn btn-sm" data-ai-use>Dùng bản chép của AI làm “Lời bạn đã nói”</button></p>` : ''}
      ${a.transcript ? `<details class="fold"><summary>Bản chép AI nghe được</summary><div class="fold-body"><p class="rich">${U.esc(a.transcript)}</p></div></details>` : ''}
      ${Object.keys(a.comments || {}).length ? `<details class="fold"><summary>Nhận xét từng tiêu chí</summary><div class="fold-body"><ul class="tips">${Object.entries(a.comments).map(([k, v]) => `<li><b class="zh">${U.esc(name(k))}</b>: ${U.esc(v)}</li>`).join('')}</ul></div></details>` : ''}
      ${(a.pronunciation || []).length ? `<details class="fold"><summary>Phát âm cần chú ý (${a.pronunciation.length})</summary><div class="fold-body"><table class="terms"><tbody>
        ${a.pronunciation.map(p => `<tr><td class="zh">${U.esc(p.text)}</td><td>Đúng: <b>${U.esc(p.expected)}</b></td><td class="muted">Nghe như: ${U.esc(p.heard)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
      ${(a.errors || []).length ? `<details class="fold" open><summary>Lỗi diễn đạt (${a.errors.length})</summary><div class="fold-body"><ul class="ai-errors">
        ${a.errors.map(e => `<li><span class="zh err-o">${U.esc(e.original)}</span> → <span class="zh err-f">${U.esc(e.fix)}</span><br><span class="small muted">${U.esc(e.why)}</span></li>`).join('')}</ul></div></details>` : ''}
      ${a.extra ? `<p class="note-box">${U.esc(a.extra)}</p>` : ''}
      ${a.improved ? `<details class="fold"><summary>Phiên bản nâng cấp</summary><div class="fold-body"><p class="rich">${U.esc(a.improved)}</p></div></details>` : ''}
      <p class="small muted">Điểm và nhận xét phát âm của AI chỉ để tham khảo.</p>
    </div>`;
  }

  /**
   * Khối ghi âm + nút Phân tích, dùng chung cho mọi phần luyện.
   * opts: { scope, context: () => ({...}), getSec: () => số giây, value: analysis cũ, onResult(analysis), useTranscript(text) }
   */
  function box(opts) {
    const el = U.el(`<div class="ai-box"></div>`);
    let rec = null, analysis = opts.value || null, busy = false;
    const draw = () => {
      const st = status();
      el.innerHTML = `
        ${rec ? `<div class="row"><audio controls src="${URL.createObjectURL(rec.blob)}"></audio><span class="small muted">Bản ghi ${U.fmtTime(rec.sec)}, chỉ nằm trên máy này</span></div>` : ''}
        ${rec ? `<div class="row"><button type="button" class="btn btn-primary" data-ai-go ${busy || !left() ? 'disabled' : ''}>${busy ? 'Đang phân tích…' : (analysis ? 'Phân tích lại' : 'Phân tích bằng AI')}</button>
          <span class="small muted">${busy ? 'Thường mất 10–30 giây.' : `Còn ${left()}/${U.num(st.limit)} lượt hôm nay.`}</span></div>` : ''}
        ${!rec && !analysis ? '' : ''}
        <div data-ai-out>${AI.panel(analysis, { withUse: !!opts.useTranscript })}</div>`;
    };
    el.addEventListener('click', async e => {
      if (e.target.closest('[data-ai-use]') && analysis) { opts.useTranscript(analysis.transcript); UI.toast('Đã điền bản chép của AI.'); return; }
      if (!e.target.closest('[data-ai-go]') || busy) return;
      busy = true; draw();
      try {
        analysis = await analyze(rec, opts.scope, opts.context ? opts.context() : {}, opts.getSec ? opts.getSec() : rec.sec);
        opts.onResult && opts.onResult(analysis);
      } catch (err) {
        UI.toast(err.message, 'bad');
      }
      busy = false; draw();
    });
    draw();
    return {
      el,
      setRec(r) { rec = r; draw(); },
      clear() { rec = null; analysis = null; draw(); },
      get analysis() { return analysis; }
    };
  }

  return { status, available, left, analyze, avgScores, compact, panel, box };
})();
