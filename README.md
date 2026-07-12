# 日本語 N1 複習系統

純前端的 N1 備考複習工具，不需安裝任何東西。

## 如何開啟

直接用瀏覽器打開 `index.html` 即可（雙擊檔案，或拖進瀏覽器視窗）。

也可以用本地伺服器開啟：

```
python -m http.server 8735 --directory n1-review
```

然後瀏覽 http://localhost:8735

## 功能

- **單字**（80 詞起）
  - 閃卡複習：間隔重複（SRS）。答對間隔依序拉長 1→2→4→7→15→30 天，答錯隔天重新出現
  - 選擇題測驗：隨機 10 題，混合「選意思」與「選讀音」，答題結果會回饋到 SRS 排程
  - 單字一覽：可搜尋，點開看例句；色點表示熟練度
- **文法**（40 條起）
  - 填空測驗：優先出到期複習的文法，每題附接續、意思與解析
  - 文法一覽：可搜尋句型或意思
- **讀解**（3 篇起）：N1 風格評論文 + 理解問題，每題附出處解析
- **首頁**：今日待複習數、熟練進度、最近測驗紀錄

學習進度存在瀏覽器的 localStorage（換瀏覽器或清除瀏覽資料會歸零）。

## 如何擴充題庫

資料檔都在 `data/` 資料夾，直接在陣列尾端加入新項目即可（`id` 不可重複）：

- `data/vocab.js` — 單字：`{ id, word, reading, meaning, pos, example, exampleTr }`
- `data/grammar.js` — 文法：`{ id, pattern, connection, meaning, example, exampleTr, quiz: { sentence, options, answer, explanation } }`
  - `quiz.sentence` 用 `___` 標示空格，`answer` 是正解在 `options` 中的索引（從 0 起算）
- `data/reading.js` — 讀解：`{ id, title, passage, questions: [{ question, options, answer, explanation }] }`

也可以直接請 Claude 幫忙批次產生新單字／文法／文章加進去。
