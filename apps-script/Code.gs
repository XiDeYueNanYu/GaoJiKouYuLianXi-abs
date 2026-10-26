/**
 * HSK 口语 – backend Google Apps Script
 *
 * Cách dùng: mở Google Sheet → Tiện ích mở rộng → Apps Script → dán toàn bộ file này
 * vào Code.gs → Triển khai → Tùy chọn triển khai mới → Ứng dụng web
 * (Thực thi với tư cách: Tôi; Người có quyền truy cập: Bất kỳ ai).
 * Chi tiết xem docs/HUONG_DAN.md trong repo.
 */

var TAB = {
  USERS: 'Users', SESSIONS: 'Sessions', SUBMISSIONS: 'Submissions', ATTEMPTS: 'Attempts',
  CONFIG: 'Config'
};
var CONTENT_TABS = ['Frames', 'Phrases', 'Compare', 'Quick', 'Materials', 'Opinions', 'MediaTypes', 'MediaIdeas', 'Interp', 'Rubric', 'Checklist'];
var HEADERS = {
  Frames: ['id', 'name_zh', 'name_vi', 'use_for', 'steps', 'phrases', 'example', 'active'],
  Phrases: ['id', 'category', 'zh', 'vi', 'example', 'frame', 'active'],
  Compare: ['id', 'question', 'answer_a', 'answer_b', 'better', 'criteria', 'analysis', 'active'],
  Quick: ['id', 'topic', 'question_zh', 'question_vi', 'speak_sec', 'hint', 'sample', 'active'],
  Materials: ['id', 'type', 'title', 'text', 'task', 'task_sample', 'questions', 'samples', 'read_sec', 'prep_sec', 'speak_sec', 'q_speak_sec', 'active'],
  Opinions: ['id', 'question', 'question_vi', 'followups', 'hints', 'sample', 'prep_sec', 'speak_sec', 'active'],
  MediaTypes: ['id', 'name_zh', 'name_vi', 'platform', 'focus', 'duration_sec', 'goal', 'blocks', 'tips', 'sample', 'active'],
  MediaIdeas: ['id', 'type', 'title', 'angle', 'hooks', 'points', 'cta', 'active'],
  Interp: ['id', 'topic', 'text_vi', 'reference_zh', 'terms', 'notes', 'prep_sec', 'speak_sec', 'active'],
  Rubric: ['id', 'scope', 'name_zh', 'name_vi', 'desc_1', 'desc_3', 'desc_5', 'active'],
  Checklist: ['id', 'scope', 'group', 'text_vi', 'text_zh', 'active'],
  Config: ['key', 'value', 'note'],
  Users: ['username', 'display_name', 'new_password', 'password_hash', 'salt', 'active', 'ai_limit', 'created_at', 'last_login', 'note'],
  Sessions: ['token', 'username', 'created_at', 'expires_at'],
  Submissions: ['id', 'username', 'type', 'ref_id', 'title', 'content', 'notes', 'data', 'char_count', 'speak_sec', 'rate',
    'scores', 'avg_score', 'ai_scores', 'ai_feedback', 'checklist_done', 'checklist_total', 'checklist_missed', 'note', 'created_at'],
  AiPrompts: ['id', 'prompt', 'note', 'active'],
  Attempts: ['id', 'username', 'item_id', 'chosen', 'answer', 'correct', 'created_at']
};
var HASH_ROUNDS = 300;
var SUBMISSION_TYPES = ['quick', 'material', 'opinion', 'interp', 'media'];
var MAX_TEXT = 40000; // giới hạn ký tự một ô Google Sheet là 50.000

/* ============================== HTTP ============================== */

function doGet() {
  return json_({ ok: true, message: 'HSK 口语 API đang chạy. Ứng dụng gọi bằng POST.' });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e && e.postData ? e.postData.contents : '{}');
  } catch (err) {
    return json_({ ok: false, error: 'BAD_REQUEST', message: 'Dữ liệu gửi lên không phải JSON hợp lệ.' });
  }
  var handler = HANDLERS[req.action];
  if (!handler) return json_({ ok: false, error: 'UNKNOWN_ACTION', message: 'Không có thao tác: ' + req.action });
  try {
    var result = handler(req) || {};
    result.ok = true;
    return json_(result);
  } catch (err) {
    if (err && err.apiCode) return json_({ ok: false, error: err.apiCode, message: err.message });
    console.error(err);
    return json_({ ok: false, error: 'SERVER_ERROR', message: String(err && err.message || err) });
  }
}

var HANDLERS = {
  ping: function () { return { time: new Date().toISOString() }; },
  login: login_,
  logout: function (req) {
    var user = auth_(req);
    removeSession_(req.token);
    return { username: user.username };
  },
  me: function (req) { var u = auth_(req); return { user: publicUser_(u) }; },
  getContent: function (req) {
    var user = auth_(req);
    var content = {};
    CONTENT_TABS.forEach(function (name) {
      content[name.toLowerCase()] = readRows_(name).filter(isActive_);
    });
    content.config = config_();
    content.ai = aiStatus_(user);
    return { content: content, loadedAt: new Date().toISOString() };
  },
  aiStatus: function (req) { return { ai: aiStatus_(auth_(req)) }; },
  analyzeAudio: analyzeAudio_,
  submit: submit_,
  logAttempt: logAttempt_,
  getHistory: getHistory_
};

/* ============================== Đăng nhập ============================== */

function login_(req) {
  var username = String(req.username || '').trim().toLowerCase();
  var password = String(req.password || '');
  if (!username || !password) throw apiError_('LOGIN_FAILED', 'Hãy nhập tên đăng nhập và mật khẩu.');

  var cfg = config_();
  var cache = CacheService.getScriptCache();
  var failKey = 'fail_' + username;
  var fails = Number(cache.get(failKey) || 0);
  var maxFail = Number(cfg.max_login_fail || 5);
  var lockMin = Number(cfg.lock_minutes || 10);
  if (fails >= maxFail) {
    throw apiError_('LOCKED', 'Nhập sai quá ' + maxFail + ' lần. Tài khoản tạm khoá ' + lockMin + ' phút.');
  }

  var users = readRows_(TAB.USERS);
  var user = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username).trim().toLowerCase() === username) { user = users[i]; break; }
  }
  var failed = function (msg) {
    cache.put(failKey, String(fails + 1), lockMin * 60);
    return apiError_('LOGIN_FAILED', msg || 'Sai tên đăng nhập hoặc mật khẩu.');
  };
  if (!user) throw failed();
  if (!isActive_(user)) throw apiError_('INACTIVE', 'Tài khoản này đang bị tắt (cột active).');
  if (!user.password_hash) {
    throw apiError_('NOT_READY', 'Tài khoản chưa có mật khẩu đã băm. Mở Sheet và chạy menu HSK 口语 → Băm mật khẩu mới.');
  }
  if (hashPassword_(password, String(user.salt)) !== String(user.password_hash)) throw failed();

  cache.remove(failKey);
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var now = new Date();
  var days = Number(cfg.session_days || 30);
  var expires = new Date(now.getTime() + days * 86400000);
  withLock_(function () {
    appendObject_(TAB.SESSIONS, { token: token, username: user.username, created_at: now, expires_at: expires });
    setCell_(TAB.USERS, user._row, 'last_login', now);
  });
  cache.put('tok_' + token, String(user.username), 21600);
  return { token: token, expiresAt: expires.toISOString(), user: publicUser_(user) };
}

function auth_(req) {
  var token = String(req.token || '');
  if (!token) throw apiError_('AUTH_REQUIRED', 'Bạn cần đăng nhập.');
  var cache = CacheService.getScriptCache();
  var username = cache.get('tok_' + token);
  if (!username) {
    var sessions = readRows_(TAB.SESSIONS);
    var now = Date.now();
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      if (String(s.token) === token && toDate_(s.expires_at).getTime() > now) { username = String(s.username); break; }
    }
    if (!username) throw apiError_('AUTH_REQUIRED', 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
    cache.put('tok_' + token, username, 21600);
  }
  var users = readRows_(TAB.USERS);
  for (var j = 0; j < users.length; j++) {
    if (String(users[j].username).toLowerCase() === username.toLowerCase()) {
      if (!isActive_(users[j])) throw apiError_('AUTH_REQUIRED', 'Tài khoản đã bị tắt.');
      return users[j];
    }
  }
  throw apiError_('AUTH_REQUIRED', 'Tài khoản không còn tồn tại.');
}

function removeSession_(token) {
  CacheService.getScriptCache().remove('tok_' + token);
  withLock_(function () {
    var sheet = sheet_(TAB.SESSIONS);
    var values = sheet.getDataRange().getValues();
    var col = values[0].indexOf('token');
    for (var r = values.length - 1; r >= 1; r--) {
      if (String(values[r][col]) === token) sheet.deleteRow(r + 1);
    }
  });
}

function publicUser_(u) {
  return { username: String(u.username), displayName: String(u.display_name || u.username) };
}

function hashPassword_(password, salt) {
  var h = salt + '|' + password;
  for (var i = 0; i < HASH_ROUNDS; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + '|' + salt, Utilities.Charset.UTF_8));
  }
  return h;
}

/* ============================== Ghi bài ============================== */

function submit_(req) {
  var user = auth_(req);
  var type = String(req.type || '');
  if (SUBMISSION_TYPES.indexOf(type) < 0) throw apiError_('BAD_REQUEST', 'Loại bài không hợp lệ: ' + type);
  var content = String(req.content || '');
  if (!content.trim()) throw apiError_('BAD_REQUEST', 'Bài làm đang trống.');
  var data = req.data == null ? '' : (typeof req.data === 'string' ? req.data : JSON.stringify(req.data));
  var notes = str_(req.notes);
  if (content.length > MAX_TEXT || data.length > MAX_TEXT || notes.length > MAX_TEXT) throw apiError_('TOO_LONG', 'Bài quá dài để lưu vào một ô (tối đa ' + MAX_TEXT + ' ký tự).');
  var scores = req.scores || {};
  var keys = Object.keys(scores).filter(function (k) { return isFinite(Number(scores[k])) && scores[k] !== ''; });
  var avg = keys.length ? Math.round(keys.reduce(function (s, k) { return s + Number(scores[k]); }, 0) / keys.length * 10) / 10 : '';
  var row = {
    id: newId_('S'),
    username: user.username,
    type: type,
    ref_id: str_(req.refId),
    title: str_(req.title).slice(0, 200),
    content: content,
    notes: notes,
    data: data,
    char_count: num_(req.charCount),
    speak_sec: num_(req.speakSec),
    rate: num_(req.rate),
    scores: keys.map(function (k) { return k + '=' + scores[k]; }).join('; '),
    avg_score: avg,
    ai_scores: scoreText_(req.aiScores),
    ai_feedback: (function () { var f = req.aiFeedback == null ? '' : (typeof req.aiFeedback === 'string' ? req.aiFeedback : JSON.stringify(req.aiFeedback)); return f.length > MAX_TEXT ? f.slice(0, MAX_TEXT) : f; })(),
    checklist_done: num_(req.checklistDone),
    checklist_total: num_(req.checklistTotal),
    checklist_missed: (req.checklistMissed || []).join('\n'),
    note: str_(req.note).slice(0, 2000),
    created_at: new Date()
  };
  withLock_(function () { appendObject_(TAB.SUBMISSIONS, row); });
  return { id: row.id, createdAt: row.created_at.toISOString() };
}

function logAttempt_(req) {
  var user = auth_(req);
  var row = {
    id: newId_('A'),
    username: user.username,
    item_id: str_(req.itemId),
    chosen: [].concat(req.chosen || []).join(','),
    answer: [].concat(req.answer || []).join(','),
    correct: req.correct ? 'đúng' : 'sai',
    created_at: new Date()
  };
  withLock_(function () { appendObject_(TAB.ATTEMPTS, row); });
  return { id: row.id };
}

function getHistory_(req) {
  var user = auth_(req);
  var me = String(user.username).toLowerCase();
  var mine = function (r) { return String(r.username).toLowerCase() === me; };
  var subs = readRows_(TAB.SUBMISSIONS).filter(mine).map(function (r) {
    var scores = parseScores_(r.scores), aiScores = parseScores_(r.ai_scores);
    return {
      id: r.id, type: r.type, refId: r.ref_id, title: r.title, content: r.content, notes: r.notes, data: r.data,
      charCount: r.char_count, speakSec: r.speak_sec, rate: r.rate, scores: scores, avgScore: r.avg_score,
      aiScores: aiScores, aiFeedback: r.ai_feedback,
      checklistDone: r.checklist_done, checklistTotal: r.checklist_total, checklistMissed: r.checklist_missed,
      note: r.note, createdAt: r.created_at
    };
  }).reverse();
  var attempts = readRows_(TAB.ATTEMPTS).filter(mine).map(function (r) {
    return { itemId: r.item_id, chosen: r.chosen, answer: r.answer, correct: r.correct === 'đúng' || r.correct === true, createdAt: r.created_at };
  });
  return { submissions: subs.slice(0, 300), attempts: attempts };
}

/* ============================== Tiện ích Sheet ============================== */

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw apiError_('SHEET_MISSING', 'Thiếu tab "' + name + '". Chạy menu HSK 口语 → Tạo các tab còn thiếu.');
  return sh;
}

function readRows_(name) {
  var values = sheet_(name).getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var empty = true;
    var obj = { _row: r + 1 };
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      var v = row[c];
      if (v instanceof Date) v = v.toISOString();
      if (v !== '' && v !== null) empty = false;
      obj[headers[c]] = v;
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}

function appendObject_(name, obj) {
  var sh = sheet_(name);
  var headers = sh.getDataRange().getValues()[0].map(function (h) { return String(h).trim(); });
  sh.appendRow(headers.map(function (h) { return obj.hasOwnProperty(h) ? obj[h] : ''; }));
}

function setCell_(name, rowNumber, header, value) {
  var sh = sheet_(name);
  var headers = sh.getDataRange().getValues()[0].map(function (h) { return String(h).trim(); });
  var col = headers.indexOf(header);
  if (col >= 0) sh.getRange(rowNumber, col + 1).setValue(value);
}

function config_() {
  var out = {};
  try {
    readRows_(TAB.CONFIG).forEach(function (r) { if (r.key) out[String(r.key).trim()] = r.value; });
  } catch (e) { /* tab Config là tuỳ chọn */ }
  return out;
}

function isActive_(row) {
  if (!row.hasOwnProperty('active')) return true;
  var v = String(row.active).trim().toLowerCase();
  return ['không', 'khong', 'no', 'false', '0', 'ẩn', 'an'].indexOf(v) < 0;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function apiError_(code, message) { var e = new Error(message); e.apiCode = code; return e; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function newId_(prefix) { return prefix + new Date().getTime().toString(36) + Math.floor(Math.random() * 1296).toString(36); }
function str_(v) { return v == null ? '' : String(v); }
function num_(v) { var n = Number(v); return isFinite(n) ? n : ''; }
function toDate_(v) { return v instanceof Date ? v : new Date(v); }

/* ============================== Menu trong Sheet ============================== */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('HSK 口语')
    .addItem('Băm mật khẩu mới', 'hashNewPasswords')
    .addItem('Xoá phiên đăng nhập hết hạn', 'cleanupSessions')
    .addItem('Đăng xuất tất cả thiết bị', 'clearAllSessions')
    .addSeparator()
    .addItem('Đặt Gemini API key', 'setGeminiKey')
    .addItem('Kiểm tra kết nối AI', 'testGemini')
    .addSeparator()
    .addItem('Tạo các tab còn thiếu', 'setupSheets')
    .addToUi();
}

/** Băm mọi mật khẩu đang nằm ở cột new_password rồi xoá ô đó. */
function hashNewPasswords() {
  var sh = sheet_(TAB.USERS);
  var values = sh.getDataRange().getValues();
  var H = values[0].map(function (h) { return String(h).trim(); });
  var iNew = H.indexOf('new_password'), iHash = H.indexOf('password_hash'), iSalt = H.indexOf('salt'),
    iCreated = H.indexOf('created_at'), iUser = H.indexOf('username');
  var done = [];
  for (var r = 1; r < values.length; r++) {
    var pw = String(values[r][iNew] == null ? '' : values[r][iNew]);
    if (!pw) continue;
    if (pw.length < 6) { done.push(values[r][iUser] + ' (bỏ qua: mật khẩu cần ít nhất 6 ký tự)'); continue; }
    var salt = Utilities.getUuid().replace(/-/g, '');
    sh.getRange(r + 1, iHash + 1).setValue(hashPassword_(pw, salt));
    sh.getRange(r + 1, iSalt + 1).setValue(salt);
    sh.getRange(r + 1, iNew + 1).setValue('');
    if (iCreated >= 0 && !values[r][iCreated]) sh.getRange(r + 1, iCreated + 1).setValue(new Date());
    done.push(String(values[r][iUser]));
  }
  SpreadsheetApp.getUi().alert(done.length ? 'Đã xử lý: ' + done.join(', ') : 'Không có ô new_password nào cần băm.');
}

function cleanupSessions() {
  var sh = sheet_(TAB.SESSIONS);
  var values = sh.getDataRange().getValues();
  var col = values[0].indexOf('expires_at');
  var now = Date.now(), removed = 0;
  for (var r = values.length - 1; r >= 1; r--) {
    if (toDate_(values[r][col]).getTime() <= now) { sh.deleteRow(r + 1); removed++; }
  }
  SpreadsheetApp.getUi().alert('Đã xoá ' + removed + ' phiên hết hạn.');
}

function clearAllSessions() {
  var sh = sheet_(TAB.SESSIONS);
  if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
  SpreadsheetApp.getUi().alert('Đã đăng xuất mọi thiết bị. Các token cũ có thể còn hiệu lực tối đa 6 giờ trong bộ nhớ đệm.');
}

/** Tạo những tab còn thiếu với đúng dòng tiêu đề (không đụng tới tab đã có). */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var created = [];
  Object.keys(HEADERS).forEach(function (name) {
    if (ss.getSheetByName(name)) return;
    var sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
    created.push(name);
  });
  SpreadsheetApp.getUi().alert(created.length ? 'Đã tạo: ' + created.join(', ') : 'Đã đủ các tab.');
}

/* ============================== AI phân tích giọng nói (Gemini) ============================== */
/*
 * API key lưu trong Script Properties (menu HSK 口语 → Đặt Gemini API key), không nằm trong mã.
 * Prompt lấy từ tab AiPrompts (id: _chung, quick, material, opinion, interp, media); thiếu thì dùng mặc định bên dưới.
 * Config: ai_enabled, ai_models (danh sách, thử lần lượt), ai_daily_limit (lượt/ngày/người), ai_max_sec.
 * Users.ai_limit: giới hạn riêng từng người (để trống = theo Config, 0 = không dùng AI).
 */
var GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
var AI_MIME = { 'audio/webm': 1, 'audio/ogg': 1, 'audio/mp4': 1, 'audio/m4a': 1, 'audio/aac': 1, 'audio/mpeg': 1, 'audio/mp3': 1, 'audio/wav': 1, 'audio/flac': 1, 'audio/opus': 1 };
var MAX_AUDIO_B64 = 14 * 1024 * 1024; // giới hạn yêu cầu Gemini là 20 MB

var DEFAULT_PROMPTS = {
  _chung: [
    'Bạn là giám khảo khẩu ngữ tiếng Trung trình độ HSK 7–9 (tham khảo cách chấm IELTS Speaking) và là giáo viên dạy tiếng Trung cho người Việt. Bạn nhận một file ghi âm người học nói tiếng Trung.',
    'Quy tắc bắt buộc:',
    '1. transcript: chép bằng chữ Hán giản thể đúng những gì nghe được, kể cả câu sai ngữ pháp, từ lặp, từ đệm (然后、那个…). Không sửa, không thêm ý. Chỗ không nghe rõ ghi [?].',
    '2. Nếu bản ghi im lặng, quá ngắn hoặc không phải tiếng Trung: transcript để trống, mọi điểm bằng 0, summary giải thích ngắn.',
    '3. Chấm mỗi tiêu chí từ 1 đến 5 theo thang bên dưới (được dùng 2 và 4). Phát âm (pro) chấm dựa trên âm thanh thực tế, không dựa trên văn bản.',
    '4. pronunciation: tối đa 8 chỗ sai thanh điệu hoặc sai âm: chữ Hán, pinyin đúng, âm nghe được.',
    '5. errors: tối đa 8 lỗi từ vựng, ngữ pháp hoặc diễn đạt: câu gốc (trích từ transcript), câu sửa, lý do ngắn.',
    '6. improved: viết lại bài nói ở mức 5/5, giữ ý và ví dụ của người học, độ dài phù hợp với {{sec}} giây nói.',
    '7. summary, comments, why, extra viết bằng tiếng Việt, ngắn gọn, cụ thể; câu tiếng Trung giữ nguyên chữ Hán.',
    'Thang chấm:',
    '{{rubric}}'
  ].join('\n'),
  quick: 'Phần luyện: Phản xạ nhanh (kiểu IELTS Part 1), trả lời khoảng 30 giây.\nCâu hỏi: {{question}}\nTrong extra: câu đầu có trả lời thẳng câu hỏi không; có lý do hoặc ví dụ cụ thể không.',
  material: 'Phần luyện: HSK 7–9, nói dựa trên tài liệu.\nTài liệu:\n{{material}}\nNhiệm vụ hoặc câu hỏi: {{question}}\nCâu trả lời tham khảo (chỉ để đối chiếu, không bắt buộc giống): {{sample}}\nTrong extra: người học có thuật lại đủ ý chính và đúng thông tin của tài liệu không; liệt kê ý bị sót hoặc sai.',
  opinion: 'Phần luyện: HSK 7–9 phần nêu quan điểm, kết hợp câu hỏi xoáy kiểu IELTS Part 3.\nCâu hỏi chính của đề: {{main}}\nCâu hỏi đang trả lời: {{question}}\nTrong extra: lập trường có rõ không; có lý do, ví dụ, nhượng bộ không; nếu là câu hỏi xoáy thì có trả lời đúng trọng tâm không.',
  interp: 'Phần luyện: dịch nói Việt → Trung.\nĐoạn tiếng Việt:\n{{source_vi}}\nBản dịch tham khảo (một cách dịch, không phải duy nhất): {{reference}}\nThuật ngữ cần có: {{terms}}\nTrong extra: liệt kê ý bị dịch sót hoặc sai nghĩa và thuật ngữ dịch sai. improved: bản dịch nói tự nhiên dựa trên ý người học.',
  media: 'Phần luyện: đọc kịch bản video ngắn cho 抖音 / 小红书 (loại: {{type}}), thời lượng mục tiêu {{target_sec}} giây.\nKịch bản người học định đọc:\n{{script}}\nTrong extra: so lời đọc với kịch bản (chỗ vấp, đọc sai, bỏ câu); nhận xét tốc độ, nhấn nhá và năng lượng giọng khi nói trước ống kính. Chấm cả các tiêu chí riêng cho video. improved: chỉnh kịch bản cho dễ nói hơn, giữ nguyên ý.'
};

function geminiKey_() { return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || ''; }
function today_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyyMMdd'); }
function usageKey_(u) { return 'aiuse_' + today_() + '_' + String(u).toLowerCase(); }

function aiStatus_(user) {
  var cfg = config_();
  var on = !cfg.hasOwnProperty('ai_enabled') || isActive_({ active: cfg.ai_enabled });
  var keySet = !!geminiKey_();
  var limit = (user.ai_limit !== undefined && user.ai_limit !== '' && user.ai_limit !== null) ? Number(user.ai_limit) : Number(cfg.ai_daily_limit || 30);
  if (!isFinite(limit)) limit = 30;
  var used = Number(PropertiesService.getScriptProperties().getProperty(usageKey_(user.username)) || 0);
  return { enabled: on && keySet && limit > 0, keySet: keySet, switchedOn: on, limit: limit, used: used, maxSec: Number(cfg.ai_max_sec || 300) };
}

function scoreText_(obj) {
  if (!obj || typeof obj !== 'object') return '';
  return Object.keys(obj).filter(function (k) { return obj[k] !== '' && obj[k] != null && isFinite(Number(obj[k])); })
    .map(function (k) { return k + '=' + obj[k]; }).join('; ');
}
function parseScores_(text) {
  var out = {};
  String(text || '').split(';').forEach(function (p) { var kv = p.split('='); if (kv.length === 2 && kv[0].trim()) out[kv[0].trim()] = Number(kv[1]); });
  return out;
}

/** Đổi lượt dùng: +1 trước khi gọi, -1 nếu gọi thất bại. Trả về số đã dùng sau khi đổi. */
function bumpUsage_(username, delta) {
  return withLock_(function () {
    var props = PropertiesService.getScriptProperties();
    var key = usageKey_(username);
    var n = Math.max(0, Number(props.getProperty(key) || 0) + delta);
    props.setProperty(key, String(n));
    if (Math.random() < 0.1) { // dọn bộ đếm của các ngày cũ
      var prefix = 'aiuse_' + today_();
      props.getKeys().forEach(function (k) { if (k.indexOf('aiuse_') === 0 && k.indexOf(prefix) !== 0) props.deleteProperty(k); });
    }
    return n;
  });
}

function analyzeAudio_(req) {
  var user = auth_(req);
  var st = aiStatus_(user);
  if (!st.keySet) throw apiError_('AI_OFF', 'Chưa đặt Gemini API key. Người quản trị mở Sheet và chạy menu HSK 口语 → Đặt Gemini API key.');
  if (!st.switchedOn) throw apiError_('AI_OFF', 'Tính năng AI đang tắt (Config → ai_enabled).');
  if (st.limit <= 0) throw apiError_('AI_OFF', 'Tài khoản này chưa được dùng AI phân tích.');
  var scope = String(req.scope || '');
  if (SUBMISSION_TYPES.indexOf(scope) < 0) throw apiError_('BAD_REQUEST', 'Phần luyện không hợp lệ: ' + scope);
  var audio = String(req.audio || '');
  if (audio.length < 1000) throw apiError_('BAD_REQUEST', 'Bản ghi âm trống hoặc quá ngắn.');
  if (audio.length > MAX_AUDIO_B64) throw apiError_('TOO_LONG', 'Bản ghi âm quá dài để gửi một lần. Hãy nói ngắn hơn ' + st.maxSec + ' giây.');
  var mime = String(req.mime || '').split(';')[0].trim().toLowerCase();
  if (mime === 'audio/x-m4a' || mime === 'audio/mp4') mime = 'audio/m4a'; // Safari ghi ra audio/mp4 (AAC trong vỏ m4a)
  if (!AI_MIME[mime]) throw apiError_('BAD_REQUEST', 'Định dạng âm thanh không hỗ trợ: ' + mime);
  if (st.used >= st.limit) throw apiError_('AI_LIMIT', 'Bạn đã dùng hết ' + st.limit + ' lượt phân tích hôm nay. Lượt mới được tính từ 0 giờ.');

  var used = bumpUsage_(user.username, 1);
  try {
    var p = buildPrompt_(scope, req.context || {}, Number(req.sec) || 0);
    var r = callGemini_(p.system, p.user, aiSchema_(p.criteria), { mime: mime, data: audio });
    return { analysis: normalizeAnalysis_(r.data, p.criteria), model: r.model, used: used, limit: st.limit };
  } catch (err) {
    bumpUsage_(user.username, -1);
    throw err;
  }
}

function aiPrompts_() {
  var out = {};
  Object.keys(DEFAULT_PROMPTS).forEach(function (k) { out[k] = DEFAULT_PROMPTS[k]; });
  try {
    readRows_('AiPrompts').filter(isActive_).forEach(function (r) { if (r.id && String(r.prompt).trim()) out[String(r.id).trim()] = String(r.prompt); });
  } catch (e) { /* chưa có tab AiPrompts: dùng mặc định */ }
  return out;
}

function buildPrompt_(scope, ctx, sec) {
  var criteria = readRows_('Rubric').filter(isActive_).filter(function (c) { return c.scope === 'core' || c.scope === scope; });
  var rubric = criteria.map(function (c) {
    return '- ' + c.id + ' ' + c.name_zh + ' (' + c.name_vi + '): 1 = ' + c.desc_1 + ' | 3 = ' + c.desc_3 + ' | 5 = ' + c.desc_5;
  }).join('\n');
  var vars = { rubric: rubric, sec: String(Math.round(sec)) };
  Object.keys(ctx).forEach(function (k) { vars[k] = String(ctx[k] == null ? '' : ctx[k]).slice(0, 6000); });
  var fill = function (t) { return String(t).replace(/\{\{(\w+)\}\}/g, function (m, k) { return vars.hasOwnProperty(k) ? vars[k] : '(không có)'; }); };
  var prompts = aiPrompts_();
  return {
    system: fill(prompts._chung),
    user: fill(prompts[scope] || '') + '\nThời gian đã nói: ' + Math.round(sec) + ' giây. Hãy phân tích file ghi âm đính kèm.',
    criteria: criteria.map(function (c) { return String(c.id); })
  };
}

function aiSchema_(criteria) {
  var scoreProps = {}, commentProps = {};
  criteria.forEach(function (id) { scoreProps[id] = { type: 'INTEGER' }; commentProps[id] = { type: 'STRING' }; });
  return {
    type: 'OBJECT',
    properties: {
      transcript: { type: 'STRING' },
      summary: { type: 'STRING' },
      scores: { type: 'OBJECT', properties: scoreProps, required: criteria },
      comments: { type: 'OBJECT', properties: commentProps, required: criteria },
      pronunciation: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, expected: { type: 'STRING' }, heard: { type: 'STRING' } }, required: ['text', 'expected', 'heard'] } },
      errors: { type: 'ARRAY', items: { type: 'OBJECT', properties: { original: { type: 'STRING' }, fix: { type: 'STRING' }, why: { type: 'STRING' } }, required: ['original', 'fix', 'why'] } },
      extra: { type: 'STRING' },
      improved: { type: 'STRING' }
    },
    required: ['transcript', 'summary', 'scores', 'comments', 'pronunciation', 'errors', 'extra', 'improved']
  };
}

function normalizeAnalysis_(a, criteria) {
  a = a || {};
  var scores = {};
  criteria.forEach(function (id) { var n = Math.round(Number((a.scores || {})[id])); scores[id] = isFinite(n) ? Math.max(0, Math.min(5, n)) : 0; });
  var arr = function (x) { return Array.isArray(x) ? x.slice(0, 12) : []; };
  return {
    transcript: String(a.transcript || ''), summary: String(a.summary || ''), scores: scores,
    comments: a.comments || {}, pronunciation: arr(a.pronunciation), errors: arr(a.errors),
    extra: String(a.extra || ''), improved: String(a.improved || '')
  };
}

/** Gọi Gemini, thử lần lượt các model trong Config → ai_models. audio = { mime, data } hoặc null. */
function callGemini_(system, userText, schema, audio) {
  var key = geminiKey_();
  if (!key) throw apiError_('AI_OFF', 'Chưa đặt Gemini API key.');
  var models = String(config_().ai_models || 'gemini-flash-latest').split(/[,\s]+/).filter(String);
  var parts = [{ text: userText }];
  if (audio) parts.push({ inlineData: { mimeType: audio.mime, data: audio.data } });
  var body = { contents: [{ role: 'user', parts: parts }], generationConfig: { temperature: 0.3 } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (schema) { body.generationConfig.responseMimeType = 'application/json'; body.generationConfig.responseSchema = schema; }
  var notes = [];
  for (var i = 0; i < models.length; i++) {
    var m = models[i];
    var res = UrlFetchApp.fetch(GEMINI_URL + encodeURIComponent(m) + ':generateContent', {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(body),
      headers: { 'x-goog-api-key': key }, muteHttpExceptions: true
    });
    var code = res.getResponseCode(), json = {};
    try { json = JSON.parse(res.getContentText()); } catch (e) { /* bỏ qua */ }
    var msg = json.error ? String(json.error.message || json.error.status || '') : '';
    if (code === 200) {
      var cand = (json.candidates || [])[0];
      var text = cand && cand.content && cand.content.parts ? cand.content.parts.map(function (p) { return p.text || ''; }).join('') : '';
      if (!text) { notes.push(m + ': không có nội dung trả về (' + (cand ? cand.finishReason : 'không có kết quả') + ')'); continue; }
      if (!schema) return { model: m, data: text };
      text = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
      try { return { model: m, data: JSON.parse(text) }; }
      catch (e) { notes.push(m + ': kết quả không phải JSON hợp lệ'); continue; }
    }
    if (code === 429) throw apiError_('AI_QUOTA', 'Gemini báo đã hết hạn mức (429). Thử lại sau ít phút, hoặc kiểm tra hạn mức của API key trong Google AI Studio.');
    if (code === 401 || code === 403) throw apiError_('AI_KEY', 'Gemini từ chối API key (' + code + '): ' + msg + ' Hãy tạo key mới và đặt lại qua menu.');
    notes.push(m + ': ' + code + ' ' + msg);
  }
  throw apiError_('AI_FAILED', 'Không model nào phân tích được. ' + notes.join(' / ') + ' Kiểm tra tên model trong Config → ai_models.');
}

/** Menu: đặt hoặc xoá API key (lưu trong Script Properties). */
function setGeminiKey() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Gemini API key', 'Dán API key lấy từ Google AI Studio. Gõ “xoa” để xoá key hiện tại.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var v = r.getResponseText().trim();
  var props = PropertiesService.getScriptProperties();
  if (v.toLowerCase() === 'xoa') { props.deleteProperty('GEMINI_API_KEY'); ui.alert('Đã xoá API key. Tính năng AI tạm tắt.'); return; }
  if (v.length < 20) { ui.alert('Key có vẻ không đúng (quá ngắn). Chưa lưu.'); return; }
  props.setProperty('GEMINI_API_KEY', v);
  ui.alert('Đã lưu API key. Chạy “Kiểm tra kết nối AI” để thử.');
}

/** Menu: gửi một câu hỏi chữ ngắn để kiểm tra key và model. */
function testGemini() {
  var ui = SpreadsheetApp.getUi();
  try {
    var r = callGemini_('', 'Trả lời đúng một từ: OK', null, null);
    ui.alert('Kết nối được. Model đang dùng: ' + r.model + '\nTrả lời: ' + String(r.data).slice(0, 100));
  } catch (e) {
    ui.alert('Chưa kết nối được: ' + e.message);
  }
}
