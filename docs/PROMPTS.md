# Bộ prompt hỏi AI để bổ sung dữ liệu (khẩu ngữ)

Mỗi prompt tạo ra các dòng đúng cột của một tab trên Google Sheet. Dùng được với Claude, ChatGPT, Gemini…

## Cách dùng chung

1. Mở tab cần bổ sung, xem **mã cuối cùng** (ví dụ `Q040`) và nội dung đã có để tránh trùng.
2. Sao chép prompt, thay các chỗ `[trong ngoặc vuông]`.
3. AI trả về một khối **TSV** (cột ngăn bằng phím Tab). Bấm nút sao chép của khối mã.
4. Bấm vào ô cột A của dòng trống đầu tiên trên Sheet, dán. Sheet tự tách cột.
5. **Đọc lại trước khi dùng**, nhất là kiến thức văn hoá, số liệu và câu mẫu (dùng prompt số 9 để soát).
6. Trong ứng dụng, bấm **Tải lại dữ liệu**.

Quy ước chung (đã có sẵn trong các prompt):

- Ô nhiều mục: ngăn các mục bằng ` || `.
- Nhãn đánh dấu trong câu mẫu, kịch bản: `【tên】…【/tên】`. Tên nhãn tối đa 6 chữ, không lồng nhau.
- Tiêu chí chấm: `flu` (trôi chảy, mạch lạc), `lex` (vốn từ), `gra` (ngữ pháp), `pro` (phát âm).
- Mã loại nội dung video: `yuyan` (kiến thức ngôn ngữ), `wenhua` (chuyện văn hoá), `kecheng` (khoá học, tài liệu), `fangfa` (phương pháp học), `jiucuo` (sửa lỗi), `bianxi` (phân biệt từ), `ziwo` (giới thiệu kênh), `vlog`, `guandian` (bình luận), `zhibo` (livestream), `xiaohongshu` (ghi chú), `gongju` (công cụ).

Nếu Sheet dán cả dòng vào một ô: dán qua Notepad trước, hoặc dùng **Chỉnh sửa → Dán đặc biệt → Chỉ dán giá trị**.

---

## 1. Câu hỏi phản xạ nhanh (tab Quick)

```text
Bạn là giám khảo khẩu ngữ HSK 7–9 và giáo viên luyện nói tiếng Trung cho người Việt.

Hãy soạn [20] câu hỏi kiểu “phản xạ nhanh” (giống IELTS Speaking Part 1): câu hỏi đời thường, trả lời trong khoảng 30 giây.

Chủ đề: [ví dụ: Công việc, Học tiếng, Mạng xã hội & sáng tạo, Ẩm thực & văn hoá]. Không trùng các câu đã có: [dán cột question_zh].

Mỗi câu gồm:
- topic: chủ đề bằng tiếng Việt (dùng đúng tên chủ đề tôi đưa).
- question_zh: câu hỏi tự nhiên như giám khảo hỏi.
- question_vi: dịch sang tiếng Việt.
- speak_sec: 30 (hoặc 40 nếu câu hỏi cần kể).
- hint: 3 mẫu câu khung giúp trả lời, có “……” cho chỗ trống, ngăn bằng “ || ”.
- sample: câu trả lời mẫu 50–80 chữ, khẩu ngữ tự nhiên (không phải văn viết), câu đầu trả lời thẳng, sau đó một lý do hoặc ví dụ. Người nói là người Việt, ví dụ gần gũi với đời sống ở Việt Nam.

Định dạng đầu ra: MỘT khối mã TSV, KHÔNG có dòng tiêu đề, mỗi câu một dòng, 8 cột ngăn bằng Tab:
id	topic	question_zh	question_vi	speak_sec	hint	sample	active
- id tiếp nối từ [Q040]; active: có
Không dùng Tab hay xuống dòng bên trong một ô.
```

---

## 2. Cặp câu trả lời để so sánh (tab Compare)

```text
Bạn là giám khảo khẩu ngữ HSK 7–9, quen với thang chấm IELTS Speaking (trôi chảy và mạch lạc, vốn từ, ngữ pháp, phát âm).

Hãy soạn [10] cặp câu trả lời cho cùng một câu hỏi, một câu ở mức trung bình (kiểu người Việt học tiếng Trung hay mắc) và một câu ở mức cao.

Yêu cầu:
- Mỗi câu trả lời 50–110 chữ, là lời nói (khẩu ngữ), không phải văn viết.
- Câu yếu có lỗi điển hình của người Việt: lặp “然后”, chỉ dùng “很+tính từ”, trật tự từ theo tiếng Việt (ví dụ “我学中文两年”, “最难的是声调对我来说”), thiếu từ nối, liệt kê không giải thích, chen tiếng Việt khi bí từ. Không cố tình viết quá tệ; câu yếu vẫn hiểu được.
- Có cặp khác biệt chủ yếu ở một tiêu chí (chỉ ngữ pháp, hoặc chỉ mạch lạc), có cặp khác ở nhiều tiêu chí.
- Câu mạnh tự nhiên, có cấu trúc rõ, dùng thành ngữ hoặc cụm cố định đúng chỗ, không khoa trương.
- Câu tốt hơn nằm ngẫu nhiên ở cột A hoặc B.
- criteria: mã tiêu chí làm nên khác biệt, chọn trong flu, lex, gra, ngăn bằng dấu phẩy, không có khoảng trắng.
- analysis: 2–3 câu tiếng Việt chỉ ra chính xác chỗ khác biệt, trích từ ngữ cụ thể.
- Câu hỏi không trùng: [dán cột question].

Định dạng đầu ra: MỘT khối TSV, KHÔNG dòng tiêu đề, 8 cột ngăn bằng Tab:
id	question	answer_a	answer_b	better	criteria	analysis	active
- id tiếp nối từ [S014]; better là A hoặc B; active: có
```

---

## 3. Tài liệu để thuật lại và trả lời (tab Materials)

```text
Bạn là người ra đề khẩu ngữ HSK 7–9. Phần 1 của đề yêu cầu thí sinh đọc văn bản (ứng dụng, tự sự hoặc nghị luận) rồi thuật lại hoặc nêu quan điểm; phần 2 trả lời câu hỏi dựa trên tài liệu.

Hãy soạn [4] tài liệu: [ví dụ: 1 văn bản ứng dụng (thông báo, quảng cáo, hướng dẫn sử dụng), 2 văn tự sự, 1 văn nghị luận ngắn].

Mỗi tài liệu:
- type: 应用文 / 记叙文 / 议论文
- title: tiêu đề ngắn tiếng Trung.
- text: 180–260 chữ, ngôn ngữ chuẩn, có số liệu hoặc chi tiết cụ thể để thuật lại. Nội dung không đưa ra sự kiện thời sự hay số liệu thực tế có thể sai; nếu là nhân vật, dùng nhân vật hư cấu.
- task: yêu cầu nhiệm vụ chính (ví dụ 请复述这个故事。/ 请概括材料的观点，并谈谈你的看法。).
- task_sample: câu trả lời mẫu 120–200 chữ, khẩu ngữ tự nhiên, thuật lại bằng lời của mình (không chép nguyên văn).
- questions: 3 câu hỏi: câu 1 hỏi thông tin hoặc suy luận từ tài liệu, câu 2 hỏi đánh giá, câu 3 mở rộng ra ngoài tài liệu. Ngăn bằng “ || ”.
- samples: 3 câu trả lời mẫu tương ứng, mỗi câu 40–90 chữ, ngăn bằng “ || ”, đúng thứ tự.
- read_sec: 90; prep_sec: 60; speak_sec: 120; q_speak_sec: 45 (thời gian luyện giả định).

Định dạng đầu ra: MỘT khối TSV, KHÔNG dòng tiêu đề, 13 cột ngăn bằng Tab:
id	type	title	text	task	task_sample	questions	samples	read_sec	prep_sec	speak_sec	q_speak_sec	active
- id tiếp nối từ [M008]; active: có
Không dùng Tab hay xuống dòng bên trong một ô.
```

---

## 4. Đề quan điểm và câu hỏi xoáy (tab Opinions)

```text
Bạn là giám khảo khẩu ngữ, kết hợp phần 3 của HSK 7–9 (trình bày quan điểm) với phần thảo luận của IELTS Speaking Part 3 (câu hỏi xoáy, trừu tượng dần).

Hãy soạn [8] đề.

Mỗi đề:
- question: câu hỏi chính, có tính tranh luận, gắn với xã hội hiện đại. Ưu tiên chủ đề: [giáo dục, công nghệ, ngôn ngữ và văn hoá, mạng xã hội và sáng tạo nội dung, nghề nghiệp, tiêu dùng…]. Tránh chủ đề chính trị nhạy cảm.
- question_vi: dịch tiếng Việt.
- followups: 3 câu hỏi xoáy, câu sau sâu hoặc trừu tượng hơn câu trước (từ cá nhân → xã hội → tương lai/giải pháp). Ngăn bằng “ || ”.
- hints: 3 gợi ý bằng tiếng Việt: khung trả lời nên dùng (观点-理由-例子-总结, PREP, 总分总, 让步转折…), ví dụ có thể dùng, và một ý nhượng bộ. Ngăn bằng “ || ”.
- sample: câu trả lời mẫu cho câu hỏi chính, 150–220 chữ, khẩu ngữ trang trọng vừa phải, có lập trường rõ, có ví dụ cá nhân của một người Việt, có nhượng bộ.
- prep_sec: 60; speak_sec: 90.
- Không trùng: [dán cột question].

Định dạng đầu ra: MỘT khối TSV, KHÔNG dòng tiêu đề, 9 cột ngăn bằng Tab:
id	question	question_vi	followups	hints	sample	prep_sec	speak_sec	active
- id tiếp nối từ [O016]; active: có
```

---

## 5. Bài dịch nói Việt → Trung (tab Interp)

```text
Bạn là giảng viên phiên dịch Việt – Trung, đang soạn bài luyện dịch nói cho phần dịch nói của HSK 7–9.

Hãy soạn [6] đoạn tiếng Việt để dịch nói sang tiếng Trung.

Yêu cầu:
- Chủ đề: [ví dụ: du lịch, ẩm thực, giáo dục, thương mại, công nghệ, môi trường, phát biểu lễ tân]. Tránh chính trị nhạy cảm.
- text_vi: 70–110 từ tiếng Việt, văn phong như bản tin, bài giới thiệu hoặc lời phát biểu. Không đưa số liệu cụ thể mà bạn không chắc chắn; dùng cách nói khái quát (“những năm gần đây”, “ngày càng nhiều”).
- reference_zh: bản dịch tham khảo tự nhiên (không dịch từng chữ), 110–180 chữ.
- terms: 4–6 thuật ngữ quan trọng dạng “tiếng Việt = tiếng Trung”; nếu có nhiều cách dịch đúng thì ngăn bằng “ / ” (ví dụ “ùn tắc giao thông = 交通拥堵 / 堵车”). Các mục ngăn bằng “ || ”.
- notes: 1–2 câu tiếng Việt về điểm khó khi dịch (cấu trúc câu, “bạn giả” Hán Việt, cách nói trang trọng).
- topic: chủ đề bằng tiếng Việt.
- prep_sec: 30; speak_sec: 60–80 tuỳ độ dài.

Định dạng đầu ra: MỘT khối TSV, KHÔNG dòng tiêu đề, 9 cột ngăn bằng Tab:
id	topic	text_vi	reference_zh	terms	notes	prep_sec	speak_sec	active
- id tiếp nối từ [T014]; active: có
```

---

## 6. Ý tưởng video (tab MediaIdeas)

Prompt hay dùng nhất. Chạy riêng cho từng loại nội dung để ý tưởng sâu hơn.

```text
Bạn là người làm nội dung giáo dục trên 抖音 và 小红书, chuyên về tiếng Trung cho người Việt. Kênh của tôi: [mô tả ngắn: ví dụ “người Việt, dạy tiếng Trung, nhắm tới người Việt đang học HSK và người Trung muốn hiểu văn hoá Việt”]. Video do tôi tự nói bằng tiếng Trung.

Hãy đề xuất [10] ý tưởng video cho loại nội dung: [yuyan / wenhua / kecheng / …] ([tên loại]).

Yêu cầu:
- Mỗi ý tưởng giải quyết MỘT vấn đề hoặc kể MỘT câu chuyện, đủ cho video 30–90 giây.
- Với yuyan, jiucuo, bianxi: chọn lỗi hoặc điểm khó thật sự phổ biến với người Việt (thanh điệu, lượng từ, 了, trật tự trạng ngữ, từ Hán Việt “bạn giả”, cặp từ dễ nhầm…). Giải thích phải chính xác về ngôn ngữ.
- Với wenhua: so sánh Việt – Trung trên chuyện đời thường (ăn uống, lễ tết, xưng hô, giao tiếp, công sở…). Chỉ nói những khác biệt có thật và phổ biến, tránh khái quát hoá “người X đều…”.
- Với kecheng: tập trung vào kết quả người học nhận được, người phù hợp và không phù hợp; không hứa hẹn quá mức (“7 ngày lưu loát”).
- title: tiêu đề video tiếng Trung, dưới 20 chữ.
- angle: góc khai thác bằng tiếng Việt, một câu.
- hooks: 2 câu mở đầu tiếng Trung, mỗi câu dưới 20 chữ, gây tò mò hoặc nêu lợi ích. Ngăn bằng “ || ”.
- points: 3 ý chính (tiếng Trung, có thể kèm tiếng Việt trong ngoặc khi giải thích từ Việt), ngăn bằng “ || ”.
- cta: một câu kêu gọi tương tác cụ thể bằng tiếng Trung (hỏi một câu dễ trả lời trong bình luận).
- Không trùng các ý tưởng đã có: [dán cột title của tab MediaIdeas].

Định dạng đầu ra: MỘT khối TSV, KHÔNG dòng tiêu đề, 8 cột ngăn bằng Tab:
id	type	title	angle	hooks	points	cta	active
- id tiếp nối từ [Y036]; type: [mã loại]; active: có
Sau khối mã, đánh dấu ý tưởng nào bạn chưa chắc về độ chính xác kiến thức để tôi kiểm tra.
```

---

## 7. Thêm loại nội dung video mới (tab MediaTypes)

```text
Bạn là người làm nội dung trên 抖音 và 小红书. Hãy thiết kế một loại nội dung mới cho kênh dạy tiếng Trung của người Việt: [ví dụ: “Phỏng vấn đường phố”, “Đọc truyện song ngữ”, “Thử thách 7 ngày”].

Định dạng đầu ra: MỘT khối TSV một dòng, KHÔNG dòng tiêu đề, 11 cột ngăn bằng Tab:
id	name_zh	name_vi	platform	focus	duration_sec	goal	blocks	tips	sample	active
- id: chữ thường không dấu, viết liền, chưa có trong danh sách: yuyan, wenhua, kecheng, fangfa, jiucuo, bianxi, ziwo, vlog, guandian, zhibo, xiaohongshu, gongju.
- platform: 抖音、小红书 hoặc một trong hai. focus: để trống (hoặc “có” nếu tôi muốn xếp lên đầu).
- duration_sec: thời lượng mục tiêu, thường 30–90.
- goal: 1 câu tiếng Việt về mục tiêu của dạng video.
- blocks: 4–6 khối, mỗi khối “Tên khối (2–4 chữ Hán)：hướng dẫn ngắn bằng tiếng Trung”, ngăn bằng “ || ”.
- tips: 3–4 mẹo bằng tiếng Việt, ngăn bằng “ || ”.
- sample: kịch bản mẫu tiếng Trung, mỗi khối bọc trong nhãn trùng tên khối: 【钩子】…【/钩子】…; độ dài khớp duration_sec ở tốc độ khoảng 230 chữ/phút.
- active: có
```

---

## 8. Mẫu câu khẩu ngữ (tab Phrases)

```text
Bạn là giáo viên khẩu ngữ tiếng Trung cho người Việt trình độ HSK 6 trở lên.

Hãy bổ sung [20] mẫu câu vào nhóm: [ví dụ: 10 mục “回应追问 (Trả lời câu hỏi xoáy)”, 10 mục “视频开场钩子 (Câu mở video)”].
Tên nhóm phải viết y hệt một trong các tên sau (hoặc nhóm mới nếu tôi yêu cầu):
开场缓冲 (Câu mở đầu tự nhiên) | 表明观点 (Nêu quan điểm) | 说明理由 (Nêu lý do) | 举例说明 (Đưa ví dụ) | 补充递进 (Bổ sung – tăng tiến) | 转折让步 (Chuyển ý – nhượng bộ) | 回应追问 (Trả lời câu hỏi xoáy) | 复述材料 (Thuật lại tài liệu) | 讲故事 (Kể chuyện) | 文化对比 (So sánh văn hoá) | 总结收尾 (Kết thúc) | 视频开场钩子 (Câu mở video) | 视频互动引导 (Kêu gọi tương tác) | 课程推荐 (Giới thiệu khoá học, tài liệu) | 口语地道表达 (Cách nói tự nhiên) | 成语俗语 (Thành ngữ hay dùng khi nói)

Yêu cầu:
- Ưu tiên cách nói tự nhiên của người bản ngữ khi NÓI (không phải văn viết), vẫn lịch sự, phù hợp thi cử hoặc quay video.
- zh: mẫu câu, “……” cho chỗ trống; biến thể tương đương ngăn bằng “/”.
- vi: nghĩa và sắc thái bằng tiếng Việt.
- example: một câu ví dụ tự nhiên.
- frame: mã khung liên quan nếu có (oreo, prep, zfz, star, retell, qcjh, duibi, rangbu, wyh, sww, gzh, sjx), để trống nếu không.
- Không trùng: [dán cột zh].

Định dạng đầu ra: MỘT khối TSV, KHÔNG dòng tiêu đề, 7 cột ngăn bằng Tab (cột trống vẫn giữ Tab):
id	category	zh	vi	example	frame	active
- id tiếp nối từ [P097]; active: có
```

---

## 9. Soát lỗi dữ liệu trước khi dùng

Nên dùng một AI **khác** với AI đã soạn.

```text
Bạn là biên tập viên tiếng Trung và giáo viên luyện thi khẩu ngữ HSK 7–9 cho người Việt. Hãy soát các dòng dữ liệu TSV dưới đây (cột: [ghi tên các cột]).

Kiểm tra từng dòng:
1. Tiếng Trung: lỗi chính tả, dùng từ sai, câu không tự nhiên khi NÓI (quá văn viết hoặc quá suồng sã so với mục đích).
2. Kiến thức: giải thích ngữ pháp, nghĩa từ, khác biệt văn hoá Việt – Trung có chính xác và không khái quát hoá quá mức không.
3. Tiếng Việt: bản dịch, giải thích có đúng, tự nhiên không.
4. Đáp án và tiêu chí (tab Compare): câu “tốt hơn” có thực sự tốt hơn ở đúng các tiêu chí ghi trong cột criteria không.
5. Nhãn 【…】: đóng mở đúng cặp, không lồng nhau, tên nhãn khớp tên khối/bước.
6. Độ dài: câu mẫu, kịch bản có hợp với thời gian nói không (khoảng 200–250 chữ/phút).

Chỉ liệt kê dòng có vấn đề: id | vấn đề | đề xuất sửa. Không chắc thì nói rõ là không chắc. Cuối cùng đưa lại các dòng đã sửa dưới dạng một khối TSV, giữ nguyên id và số cột.

Dữ liệu:
[dán các dòng]
```

---

## 10. Nhận xét bài nói đã lưu

Mở bài trong trang **Lịch sử**, bấm **Sao chép lời nói**, rồi dùng:

```text
Bạn là giám khảo khẩu ngữ HSK 7–9, quen thang chấm IELTS Speaking, và là giáo viên tiếng Trung cho người Việt.

Phần thi: [Phản xạ nhanh / Tài liệu / Quan điểm / Dịch nói]
Câu hỏi hoặc đề: [dán]
Thời gian tôi nói: [..] giây. Tốc độ: [..] chữ/phút.
Bản ghi lời nói của tôi (gõ lại hoặc đọc chính tả, có thể có lỗi nhận dạng):
[dán]

Nhận xét bằng tiếng Việt:
1. Chấm từng tiêu chí trên thang 1–5 (trôi chảy và mạch lạc, vốn từ, ngữ pháp), nêu lý do. Không chấm phát âm vì chỉ có văn bản.
2. Mạch trả lời: có trả lời thẳng không, có lý do và ví dụ không, câu hỏi xoáy có đúng trọng tâm không.
3. Tối đa 8 lỗi: câu gốc → câu sửa → lý do. Bỏ qua lỗi có vẻ do nhận dạng giọng nói.
4. 5 cách nói tự nhiên hơn hoặc cao cấp hơn tôi có thể thay vào.
5. Viết lại câu trả lời ở mức 5/5, giữ nguyên ý và ví dụ của tôi, độ dài tương đương thời gian tôi đã nói.
```

---

## 11. Nhận xét kịch bản video trước khi quay

```text
Bạn là người làm nội dung giáo dục trên 抖音 và 小红书, kiêm giáo viên tiếng Trung. Người xem của tôi: [mô tả].

Loại video: [ví dụ: 语言知识分享]. Thời lượng mục tiêu: [45] giây.
Kịch bản (các khối đánh dấu bằng 【…】):
[dán kịch bản]

Hãy nhận xét bằng tiếng Việt:
1. Câu mở: có giữ chân người xem trong 3 giây không? Đưa 3 phương án câu mở tốt hơn (tiếng Trung, dưới 15 chữ).
2. Giá trị: người xem nhận được đúng một điều gì? Có chỗ nào thừa cần cắt không?
3. Độ chính xác: kiến thức ngôn ngữ, văn hoá trong kịch bản có chỗ nào sai hoặc khái quát hoá quá mức không.
4. Lời nói: câu nào quá dài hoặc quá văn viết khi đọc thành tiếng? Sửa lại cho dễ nói.
5. Lời kêu gọi: có cụ thể không? Đề xuất một câu hỏi bình luận dễ trả lời hơn.
6. Viết lại toàn bộ kịch bản đã chỉnh, giữ đúng các nhãn khối.
```
