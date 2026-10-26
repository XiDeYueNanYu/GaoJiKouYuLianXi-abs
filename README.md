# 口语 · Luyện khẩu ngữ tiếng Trung

Công cụ luyện nói tiếng Trung cho ba mục tiêu: thi khẩu ngữ HSK 3.0 cấp 7–9, luyện sâu theo khung IELTS Speaking, và nói trước ống kính cho video 抖音 / 小红书. Nội dung và bài làm lưu trên Google Sheet; đăng nhập bằng tài khoản do người quản trị tạo trong Sheet.

## Tám phần luyện

| Mục | Làm gì |
|---|---|
| **Thư viện** | 12 khung biểu đạt (观点-理由-例子-总结, PREP, 总分总, STAR, 复述, 起承转合, 钩子-价值-行动…) với các bước, mẫu câu, câu trả lời mẫu gạch chân theo bước; kho mẫu câu khẩu ngữ; thang tự chấm. |
| **So sánh** | Hai câu trả lời cho cùng một câu hỏi: chọn câu tốt hơn và tiêu chí khác biệt, xem phân tích. |
| **Phản xạ** | Câu hỏi đời thường kiểu IELTS Part 1, vài giây đọc đề rồi nói 30 giây, nhiều câu liên tiếp. |
| **Tài liệu** | Bám phần 1–2 của HSK 7–9: đọc văn bản có tính giờ, thuật lại hoặc nêu quan điểm, rồi trả lời ba câu hỏi. |
| **Quan điểm** | Bám phần 3 của HSK 7–9, thêm chuỗi câu hỏi xoáy kiểu IELTS Part 3. |
| **Dịch nói** | Đọc đoạn tiếng Việt, nói bản dịch tiếng Trung, so với bản tham khảo và tự kiểm tra thuật ngữ. |
| **Video** | Xưởng kịch bản cho 12 dạng nội dung (trọng tâm: kiến thức ngôn ngữ, chuyện và so sánh văn hoá, giới thiệu khoá học/tài liệu). Soạn theo khối, ước lượng thời lượng, máy nhắc chữ toàn màn hình. |
| **Lịch sử** | Điểm tự chấm theo từng tiêu chí (so 5 bài đầu với 5 bài gần nhất), tốc độ nói, các bài đã lưu. |

**AI phân tích giọng nói (tuỳ chọn):** ghi âm ngay trên trang, bấm **Phân tích bằng AI** để Gemini chép lại lời nói, chấm điểm theo tiêu chí, chỉ lỗi phát âm và diễn đạt, và đưa ra phiên bản nâng cấp. API key nằm trong Apps Script, có giới hạn lượt cho từng người dùng. Không lưu file ghi âm.

Mọi lượt nói đều có đồng hồ chuẩn bị và đồng hồ nói (kèm tiếng bíp), ô ghi ý chính, ô bản ghi lời nói (dùng đọc chính tả của bàn phím điện thoại), tốc độ nói, cảnh báo từ đệm lặp, và tự chấm theo 4 tiêu chí phỏng theo IELTS (cộng 3 tiêu chí riêng cho video).

## Dữ liệu mẫu đi kèm

`data/HSK_KouYu_Sheet_mau.xlsx`: 12 khung biểu đạt, 97 mẫu câu, 14 cặp so sánh, 40 câu phản xạ, 8 tài liệu, 16 đề quan điểm kèm 48 câu hỏi xoáy, 14 bài dịch nói, 12 dạng video kèm kịch bản mẫu, 36 ý tưởng video, thang chấm 7 tiêu chí, 21 mục checklist.

## Cấu trúc

```
index.html
css/style.css
js/config.js          ← dán URL Web App vào đây
js/util.js, store.js, api.js, ai.js, ui.js, app.js
js/modules/           ← mỗi phần luyện một file
apps-script/Code.gs   ← mã backend, dán vào Apps Script của Sheet
data/                 ← file Sheet mẫu
docs/HUONG_DAN.md     ← cài đặt từng bước
docs/PROMPTS.md       ← prompt nhờ AI soạn thêm dữ liệu và nhận xét bài nói
```

HTML/CSS/JS thuần, không cần build. Chạy bằng GitHub Pages hoặc mở trực tiếp `index.html`.

## Bắt đầu

Xem [docs/HUONG_DAN.md](docs/HUONG_DAN.md).
