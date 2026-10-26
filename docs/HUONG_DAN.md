# Hướng dẫn cài đặt và sử dụng

Hệ thống gồm ba phần:

- **Google Sheet**: nơi chứa nội dung bài học, tài khoản và bài làm.
- **Google Apps Script**: đoạn mã gắn với Sheet, đóng vai trò máy chủ (đăng nhập, đọc nội dung, ghi bài).
- **Trang web** (thư mục này): đặt trên GitHub Pages, gọi tới Apps Script.

Làm theo thứ tự dưới đây, mất khoảng 15 phút.

## Bước 1. Tạo Google Sheet từ file mẫu

1. Vào Google Drive, tải lên file `data/HSK_KouYu_Sheet_mau.xlsx`.
2. Nhấp đúp vào file → **Mở bằng Google Trang tính**.
3. Chọn **Tệp → Lưu dưới dạng Google Trang tính**. Từ đây làm việc trên bản Google Trang tính vừa tạo (không phải bản .xlsx).

Sheet có các tab: `_HuongDan` (giải thích từng cột), `Frames`, `Phrases`, `Compare`, `Quick`, `Materials`, `Opinions`, `MediaTypes`, `MediaIdeas`, `Interp`, `Rubric`, `Checklist`, `Config`, `Users`, `Sessions`, `Submissions`, `Attempts`. Không đổi tên tab và tên cột ở dòng 1.

## Bước 2. Gắn Apps Script

1. Trong Sheet: **Tiện ích mở rộng → Apps Script**.
2. Xoá nội dung mặc định trong `Code.gs`, dán toàn bộ nội dung file `apps-script/Code.gs` của repo vào, bấm biểu tượng lưu.
3. Quay lại tab Sheet và **tải lại trang**. Trên thanh menu xuất hiện mục **HSK 口语**.

## Bước 3. Đặt mật khẩu cho tài khoản

1. Mở tab `Users`. Dòng mẫu có tên đăng nhập `admin`.
2. Ở cột `new_password`, gõ mật khẩu bạn muốn (ít nhất 6 ký tự).
3. Chọn menu **HSK 口语 → Băm mật khẩu mới**.
   - Lần đầu, Google hỏi cấp quyền. Chọn tài khoản của bạn → **Nâng cao** → **Đi tới … (không an toàn)** → **Cho phép**. Cảnh báo này xuất hiện với mọi script cá nhân chưa qua kiểm duyệt của Google; script chỉ truy cập chính Sheet này.
4. Script điền `password_hash`, `salt` và xoá ô `new_password`. Mật khẩu gốc không được lưu ở đâu cả.

**Thêm người dùng sau này:** thêm một dòng mới (username, display_name, new_password, active = có), rồi chạy lại menu **Băm mật khẩu mới**.
**Đổi hoặc cấp lại mật khẩu:** gõ mật khẩu mới vào `new_password` của người đó rồi chạy menu.
**Tạm khoá một người:** đổi cột `active` thành `không`.

## Bước 4. Triển khai Web App

1. Trong trình soạn Apps Script: **Triển khai → Tùy chọn triển khai mới**.
2. Bấm biểu tượng bánh răng cạnh “Chọn loại” → **Ứng dụng web**.
3. Thiết lập:
   - **Thực thi với tư cách:** Tôi
   - **Người có quyền truy cập:** Bất kỳ ai
4. Bấm **Triển khai**, sao chép **URL ứng dụng web** (kết thúc bằng `/exec`).

“Bất kỳ ai” chỉ có nghĩa là ai có URL đều gửi được yêu cầu; mọi thao tác vẫn phải đăng nhập bằng tài khoản trong tab `Users`. Không ai xem được nội dung Sheet nếu bạn không chia sẻ file.

**Khi sửa Code.gs sau này:** **Triển khai → Quản lý các bản triển khai** → biểu tượng bút chì → **Phiên bản: Phiên bản mới** → **Triển khai**. Làm như vậy URL được giữ nguyên. Nếu tạo “triển khai mới” thì URL sẽ đổi và phải dán lại vào `config.js`.

## Bước 5. Cấu hình trang web

Mở `js/config.js`, thay `DAN_URL_WEB_APP_VAO_DAY` bằng URL `/exec` ở bước 4:

```js
window.APP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
  STORAGE_PREFIX: 'ky'
};
```

Có thể thử ngay bằng cách mở `index.html` trực tiếp trên máy (nhấp đúp), không cần máy chủ.

## Bước 6. Đưa lên GitHub Pages

1. Tạo repo mới trên GitHub, tải toàn bộ thư mục này lên (giữ nguyên cấu trúc).
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, chọn nhánh `main`, thư mục `/ (root)` → **Save**.
3. Sau 1–2 phút, trang có tại `https://<tên-github>.github.io/<tên-repo>/`.

URL Web App trong `config.js` để công khai trên GitHub là an toàn. Đừng commit file Sheet có dữ liệu bài làm thật nếu repo để công khai: file `data/HSK_KouYu_Sheet_mau.xlsx` chỉ là dữ liệu mẫu.

## Luyện nói khi dữ liệu là văn bản

Mỗi lượt nói có ba giai đoạn: **chuẩn bị** (đếm ngược, viền vàng), **đang nói** (đếm ngược, viền đỏ) và **đã xong**. Có tiếng bíp khi chuyển giai đoạn; tắt ở thanh bên trái hoặc **Tuỳ chọn** trên điện thoại.

Để có bản ghi lời nói mà không phải gõ, dùng tính năng đọc chính tả của bàn phím:

- **Android (Gboard):** Cài đặt Gboard → Ngôn ngữ → thêm **Tiếng Trung (giản thể)**. Khi đang nói, chạm vào ô “Lời bạn đã nói”, chuyển bàn phím sang tiếng Trung rồi bấm biểu tượng micro.
- **iPhone:** Cài đặt → Cài đặt chung → Bàn phím → thêm **Tiếng Trung giản thể** và bật **Đọc chính tả**. Khi nói, chuyển sang bàn phím tiếng Trung và bấm micro.
- **Máy tính:** Windows có Win + H (cần gói ngôn ngữ tiếng Trung); macOS bấm phím Fn hai lần sau khi chọn ngôn ngữ đọc chính tả tiếng Trung.

Bản ghi có thể nhận sai vài chữ, nhất là khi phát âm chưa chuẩn: đó cũng là một cách tự kiểm tra phát âm. Ứng dụng dùng bản ghi để tính tốc độ nói (chữ/phút), phát hiện từ đệm lặp nhiều (然后, 就是, 那个…) và những mẫu câu trong kho bạn đã dùng.

Muốn tự đánh giá phát âm, hãy thu âm bằng điện thoại song song khi nói rồi nghe lại; nếu không nghe lại thì chọn **Bỏ qua** ở tiêu chí 语音语调 khi tự chấm.

**Về thời gian:** đề chính thức có 5 câu khẩu ngữ trong khoảng 24 phút, nhưng chưa công bố thời gian chuẩn bị và trả lời của từng câu. Các con số trong Sheet (`read_sec`, `prep_sec`, `speak_sec`… và tab `Config`) là giá trị luyện tập giả định; chỉnh lại khi có đề cương hoặc đề mẫu chính thức.

## Bổ sung và chỉnh sửa nội dung

- Thêm dòng trực tiếp vào các tab nội dung, theo giải thích ở tab `_HuongDan`. Muốn ẩn một dòng mà không xoá: đổi `active` thành `không`.
- Ô nhiều mục (bước, câu hỏi, câu hỏi xoáy, khối kịch bản, thuật ngữ…): ngăn bằng ` || ` hoặc xuống dòng trong ô bằng Ctrl+Enter (Cmd+Enter trên Mac).
- Đánh dấu thành phần trong câu mẫu và kịch bản bằng `【tên】…【/tên】`. Tên nhãn tuỳ ý, tối đa 6 chữ; ứng dụng tô màu theo thứ tự xuất hiện. Nên đặt tên nhãn trùng tên bước (tab `Frames`) hoặc tên khối (tab `MediaTypes`).
- Dùng bộ prompt ở `docs/PROMPTS.md` để nhờ AI soạn thêm dữ liệu đúng định dạng, nhất là ý tưởng video (prompt số 6).
- Sửa xong, trong ứng dụng bấm **Tải lại dữ liệu**.

## Các tab do ứng dụng tự ghi

| Tab | Nội dung |
|---|---|
| `Sessions` | Phiên đăng nhập (mặc định 30 ngày, đổi ở `Config → session_days`). Menu **Xoá phiên đăng nhập hết hạn** để dọn dẹp; **Đăng xuất tất cả thiết bị** khi nghi lộ mật khẩu. |
| `Submissions` | Mọi bài đã lưu: lời nói (bản ghi), ý chính đã chuẩn bị, thời gian nói, tốc độ (chữ/phút), điểm từng tiêu chí (`scores`), điểm trung bình, checklist, ghi chú. Kịch bản video được lưu kèm nhãn khối. |
| `Attempts` | Từng lượt làm bài so sánh: câu đã chọn, tiêu chí đã chọn, đúng/sai. |

## Bảo mật

- Mật khẩu được băm SHA-256 nhiều vòng kèm salt riêng cho từng người.
- Nhập sai 5 lần liên tiếp thì tài khoản tạm khoá 10 phút (đổi ở `Config`).
- Bản nháp đang viết nằm trong trình duyệt của máy đang dùng cho tới khi nộp. Dùng máy chung thì nhớ **Đăng xuất**.
- Chủ Sheet xem được mọi bài làm của mọi người dùng.

## Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| “Chưa cấu hình URL Web App” | Dán URL `/exec` vào `js/config.js`. |
| “Không kết nối được máy chủ” | Kiểm tra mạng; kiểm tra Web App đặt **Người có quyền truy cập: Bất kỳ ai** và **Thực thi với tư cách: Tôi**. |
| “Máy chủ trả về dữ liệu không đọc được” | URL sai hoặc là URL `/dev`. Dùng URL `/exec` của bản triển khai. |
| “Tài khoản chưa có mật khẩu đã băm” | Chạy menu **HSK 口语 → Băm mật khẩu mới**. |
| “Thiếu tab …” | Chạy menu **HSK 口语 → Tạo các tab còn thiếu**, hoặc kiểm tra tên tab có gõ đúng không. |
| Sửa Sheet nhưng ứng dụng không đổi | Bấm **Tải lại dữ liệu**. |
| Không nghe tiếng bíp | Trình duyệt chỉ phát âm thanh sau khi bạn bấm một nút trên trang; kiểm tra công tắc **Tiếng bíp khi hết giờ** và âm lượng. |
| Máy nhắc chữ chạy quá nhanh hoặc quá chậm | Dùng nút **Chậm**/**Nhanh**, hoặc đổi **Tốc độ nói** trong xưởng kịch bản. Mặc định lấy từ `Config → speaking_rate`. |
| Sửa Code.gs nhưng không có tác dụng | Phải triển khai **Phiên bản mới** (xem bước 4). |
| Không hiện pinyin | Thư viện pinyin tải từ mạng (jsDelivr); kiểm tra kết nối rồi tải lại trang. |
