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
  Users: ['username', 'display_name', 'new_password', 'password_hash', 'salt', 'active', 'created_at', 'last_login', 'note'],
  Sessions: ['token', 'username', 'created_at', 'expires_at'],
  Submissions: ['id', 'username', 'type', 'ref_id', 'title', 'content', 'notes', 'data', 'char_count', 'speak_sec', 'rate',
    'scores', 'avg_score', 'checklist_done', 'checklist_total', 'checklist_missed', 'note', 'created_at'],
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
    auth_(req);
    var content = {};
    CONTENT_TABS.forEach(function (name) {
      content[name.toLowerCase()] = readRows_(name).filter(isActive_);
    });
    content.config = config_();
    return { content: content, loadedAt: new Date().toISOString() };
  },
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
    var scores = {};
    String(r.scores || '').split(';').forEach(function (p) { var kv = p.split('='); if (kv.length === 2 && kv[0].trim()) scores[kv[0].trim()] = Number(kv[1]); });
    return {
      id: r.id, type: r.type, refId: r.ref_id, title: r.title, content: r.content, notes: r.notes, data: r.data,
      charCount: r.char_count, speakSec: r.speak_sec, rate: r.rate, scores: scores, avgScore: r.avg_score,
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
