/* ===== N1 複習系統 主程式 ===== */

/* ---------- 儲存層 (localStorage) ---------- */
const STORE_KEY = "n1-review-state-v1";

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch { return {}; }
}
function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

const state = Object.assign({
  srs: {},          // { vocabId: { level, due } }  due = "YYYY-MM-DD"
  grammarSrs: {},   // { grammarId: { level, due } }
  quizHistory: [],  // { date, type, score, total }
  readingDone: {},  // { readingId: score }
  listeningDone: {}, // { listeningId: 1(對)|0(錯) }
}, loadState());

/* ---------- SRS ---------- */
const INTERVALS = [0, 1, 2, 4, 7, 15, 30]; // level -> 天數

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function today() {
  return fmtDate(new Date());
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}
function getSrs(map, id) {
  return map[id] || { level: 0, due: today() };
}
function rateSrs(map, id, ok) {
  const cur = getSrs(map, id);
  const level = ok ? Math.min(cur.level + 1, INTERVALS.length - 1) : 0;
  map[id] = { level, due: addDays(today(), INTERVALS[level]) };
  saveState();
}
function dueItems(map, data) {
  const t = today();
  return data.filter(item => getSrs(map, item.id).due <= t);
}

/* ---------- 工具 ---------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample(arr, n) { return shuffle(arr).slice(0, n); }
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const main = document.getElementById("main");

/* ---------- 導覽 ---------- */
const views = { home: renderHome, vocab: renderVocab, grammar: renderGrammar, reading: renderReading, listening: renderListening };
let currentView = "home";

function nav(view) {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  currentView = view;
  document.querySelectorAll("nav button").forEach(b =>
    b.classList.toggle("active", b.dataset.view === view));
  main.innerHTML = "";
  views[view]();
  window.scrollTo(0, 0);
}

document.querySelectorAll("nav button").forEach(b =>
  b.addEventListener("click", () => nav(b.dataset.view)));

/* ---------- 首頁 ---------- */
function renderHome() {
  const vocabDue = dueItems(state.srs, VOCAB_DATA).length;
  const grammarDue = dueItems(state.grammarSrs, GRAMMAR_DATA).length;
  const learned = Object.values(state.srs).filter(s => s.level >= 4).length;
  const readingDone = Object.keys(state.readingDone).length;
  const listeningDone = Object.keys(state.listeningDone).length;

  const recent = state.quizHistory.slice(-5).reverse();
  const historyHtml = recent.length
    ? recent.map(h => `<div class="muted">${h.date}｜${esc(h.type)}｜${h.score} / ${h.total}</div>`).join("")
    : `<div class="muted">尚無測驗紀錄</div>`;

  main.appendChild(el(`
    <div>
      <div class="stat-grid">
        <div class="stat"><div class="num">${vocabDue}</div><div class="label">今日待複習單字</div></div>
        <div class="stat"><div class="num">${grammarDue}</div><div class="label">今日待複習文法</div></div>
        <div class="stat"><div class="num">${learned} / ${VOCAB_DATA.length}</div><div class="label">已熟練單字</div></div>
        <div class="stat"><div class="num">${readingDone} / ${READING_DATA.length}</div><div class="label">已完成讀解</div></div>
        <div class="stat"><div class="num">${listeningDone} / ${LISTENING_DATA.length}</div><div class="label">已完成聽力</div></div>
      </div>
      <div class="card" style="margin-top:16px">
        <h2>今日建議</h2>
        <p class="muted">${vocabDue + grammarDue > 0
          ? `你有 ${vocabDue} 個單字、${grammarDue} 條文法到了複習時間，先從閃卡複習開始吧。`
          : "今天的複習都完成了！可以做一回測驗或讀解練習來鞏固。"}</p>
        <div class="btn-row">
          <button class="btn" id="go-vocab">複習單字</button>
          <button class="btn secondary" id="go-grammar">複習文法</button>
          <button class="btn secondary" id="go-reading">讀解練習</button>
        </div>
      </div>
      <div class="card">
        <h2>最近測驗</h2>
        ${historyHtml}
      </div>
    </div>
  `));
  document.getElementById("go-vocab").onclick = () => nav("vocab");
  document.getElementById("go-grammar").onclick = () => nav("grammar");
  document.getElementById("go-reading").onclick = () => nav("reading");
}

/* ---------- 單字 ---------- */
function renderVocab() {
  const due = dueItems(state.srs, VOCAB_DATA).length;
  main.appendChild(el(`
    <div>
      <div class="card">
        <h2>單字複習</h2>
        <p class="muted">閃卡採用間隔重複（答對間隔加長：1→2→4→7→15→30 天，答錯重來）。今日待複習：<b>${due}</b> 張</p>
        <div class="btn-row">
          <button class="btn" id="v-flash" ${due ? "" : "disabled"}>開始閃卡複習</button>
          <button class="btn secondary" id="v-quiz">選擇題測驗（10 題）</button>
          <button class="btn secondary" id="v-list">單字一覽</button>
        </div>
      </div>
      <div id="v-area"></div>
    </div>
  `));
  document.getElementById("v-flash").onclick = () => startFlashcards();
  document.getElementById("v-quiz").onclick = () => startVocabQuiz();
  document.getElementById("v-list").onclick = () => showVocabList();
  showVocabList();
}

/* 閃卡複習 */
function startFlashcards() {
  const area = document.getElementById("v-area");
  const queue = shuffle(dueItems(state.srs, VOCAB_DATA));
  let idx = 0, done = 0;

  function next() {
    area.innerHTML = "";
    if (idx >= queue.length) {
      area.appendChild(el(`
        <div class="card result-banner">
          <h2>閃卡複習完成 🎉</h2>
          <p class="muted">共複習 ${done} 張。答錯的卡片明天會再出現。</p>
          <div class="btn-row" style="justify-content:center"><button class="btn" id="back">回單字選單</button></div>
        </div>`));
      document.getElementById("back").onclick = () => nav("vocab");
      return;
    }
    const item = queue[idx];
    const lv = getSrs(state.srs, item.id).level;
    const card = el(`
      <div>
        <div class="progress-bar"><div class="fill" style="width:${(idx / queue.length) * 100}%"></div></div>
        <div class="flashcard" id="fc">
          <span class="pos">${esc(item.pos)}｜熟練度 ${lv}</span>
          <div class="word">${esc(item.word)}</div>
          <div id="fc-back" style="display:none">
            <div class="reading">${esc(item.reading)}</div>
            <div class="meaning">${esc(item.meaning)}</div>
            <div class="example">${esc(item.example)}<br>${esc(item.exampleTr)}</div>
          </div>
          <p class="muted" id="fc-hint">點擊卡片顯示答案</p>
        </div>
        <div class="rate-row" id="rate" style="display:none">
          <button class="rate-btn again">不記得<small>明天再出現</small></button>
          <button class="rate-btn good">記得<small>間隔加長</small></button>
        </div>
      </div>`);
    area.appendChild(card);

    const fc = card.querySelector("#fc");
    fc.onclick = () => {
      card.querySelector("#fc-back").style.display = "block";
      card.querySelector("#fc-hint").style.display = "none";
      card.querySelector("#rate").style.display = "flex";
    };
    card.querySelector(".again").onclick = () => { rateSrs(state.srs, item.id, false); idx++; done++; next(); };
    card.querySelector(".good").onclick = () => { rateSrs(state.srs, item.id, true); idx++; done++; next(); };
  }
  next();
  area.scrollIntoView({ behavior: "smooth" });
}

/* 單字選擇題 */
function startVocabQuiz() {
  const area = document.getElementById("v-area");
  const questions = sample(VOCAB_DATA, 10).map(item => {
    const mode = Math.random() < 0.5 ? "meaning" : "reading";
    const pool = VOCAB_DATA.filter(v => v.id !== item.id);
    const distractors = sample(pool, 3).map(v => mode === "meaning" ? v.meaning : v.reading);
    const correct = mode === "meaning" ? item.meaning : item.reading;
    const options = shuffle([correct, ...distractors]);
    return { item, mode, options, answer: options.indexOf(correct) };
  });
  runQuiz(area, questions, {
    type: "單字測驗",
    renderQ: q => `<div class="quiz-q">${q.mode === "meaning" ? "這個單字的意思是？" : "這個單字的讀音是？"}<span class="big">${esc(q.item.word)}</span></div>`,
    renderExp: q => `<span class="tag">${esc(q.item.word)}（${esc(q.item.reading)}）＝${esc(q.item.meaning)}</span><br>${esc(q.item.example)}<br>${esc(q.item.exampleTr)}`,
    onAnswer: (q, ok) => rateSrs(state.srs, q.item.id, ok),
    onDone: () => nav("vocab"),
  });
}

/* 單字一覽 */
function showVocabList() {
  const area = document.getElementById("v-area");
  area.innerHTML = "";
  const wrap = el(`<div>
    <input class="search-box" id="v-search" placeholder="搜尋單字、讀音或意思…">
    <div class="item-list" id="v-items"></div>
  </div>`);
  area.appendChild(wrap);
  const listEl = wrap.querySelector("#v-items");

  function render(filter = "") {
    listEl.innerHTML = "";
    const f = filter.trim().toLowerCase();
    VOCAB_DATA
      .filter(v => !f || v.word.includes(f) || v.reading.includes(f) || v.meaning.toLowerCase().includes(f))
      .forEach(v => {
        const lv = getSrs(state.srs, v.id).level;
        const row = el(`
          <div class="item-row">
            <div class="head">
              <span><span class="w">${esc(v.word)}</span> <span class="r">${esc(v.reading)}</span><span class="level-dot l${lv}" title="熟練度 ${lv}"></span></span>
              <span class="m">${esc(v.meaning)}</span>
            </div>
            <div class="detail">${esc(v.pos)}<br>${esc(v.example)}<br><span class="muted">${esc(v.exampleTr)}</span></div>
          </div>`);
        row.onclick = () => row.classList.toggle("open");
        listEl.appendChild(row);
      });
  }
  wrap.querySelector("#v-search").addEventListener("input", e => render(e.target.value));
  render();
}

/* ---------- 文法 ---------- */
function renderGrammar() {
  const due = dueItems(state.grammarSrs, GRAMMAR_DATA).length;
  main.appendChild(el(`
    <div>
      <div class="card">
        <h2>文法複習</h2>
        <p class="muted">今日待複習文法：<b>${due}</b> 條。測驗答對會拉長該文法的複習間隔。</p>
        <div class="btn-row">
          <button class="btn" id="g-quiz">文法填空測驗（10 題）</button>
          <button class="btn secondary" id="g-list">文法一覽</button>
        </div>
      </div>
      <div id="g-area"></div>
    </div>
  `));
  document.getElementById("g-quiz").onclick = () => startGrammarQuiz();
  document.getElementById("g-list").onclick = () => showGrammarList();
  showGrammarList();
}

function startGrammarQuiz() {
  const area = document.getElementById("g-area");
  // 優先出到期的文法，不足再隨機補
  const due = shuffle(dueItems(state.grammarSrs, GRAMMAR_DATA));
  const rest = shuffle(GRAMMAR_DATA.filter(g => !due.includes(g)));
  const picked = due.concat(rest).slice(0, 10);
  const questions = picked.map(g => ({
    item: g,
    options: g.quiz.options,
    answer: g.quiz.answer,
  }));
  runQuiz(area, questions, {
    type: "文法測驗",
    renderQ: q => `<div class="quiz-q">選出最合適的表達：<span class="big" style="font-size:1.25rem">${esc(q.item.quiz.sentence)}</span></div>`,
    renderExp: q => `<span class="tag">${esc(q.item.pattern)}</span>（${esc(q.item.connection)}）＝${esc(q.item.meaning)}<br>${esc(q.item.quiz.explanation)}`,
    onAnswer: (q, ok) => rateSrs(state.grammarSrs, q.item.id, ok),
    onDone: () => nav("grammar"),
  });
}

function showGrammarList() {
  const area = document.getElementById("g-area");
  area.innerHTML = "";
  const wrap = el(`<div>
    <input class="search-box" id="g-search" placeholder="搜尋文法句型或意思…">
    <div class="item-list" id="g-items"></div>
  </div>`);
  area.appendChild(wrap);
  const listEl = wrap.querySelector("#g-items");

  function render(filter = "") {
    listEl.innerHTML = "";
    const f = filter.trim().toLowerCase();
    GRAMMAR_DATA
      .filter(g => !f || g.pattern.includes(f) || g.meaning.toLowerCase().includes(f))
      .forEach(g => {
        const lv = getSrs(state.grammarSrs, g.id).level;
        const row = el(`
          <div class="item-row">
            <div class="head">
              <span><span class="w">${esc(g.pattern)}</span><span class="level-dot l${lv}" title="熟練度 ${lv}"></span></span>
              <span class="m">${esc(g.meaning)}</span>
            </div>
            <div class="detail">接續：${esc(g.connection)}<br>${esc(g.example)}<br><span class="muted">${esc(g.exampleTr)}</span></div>
          </div>`);
        row.onclick = () => row.classList.toggle("open");
        listEl.appendChild(row);
      });
  }
  wrap.querySelector("#g-search").addEventListener("input", e => render(e.target.value));
  render();
}

/* ---------- 通用測驗引擎 ---------- */
function runQuiz(area, questions, { type, renderQ, renderExp, onAnswer, onDone }) {
  let idx = 0, score = 0;

  function next() {
    area.innerHTML = "";
    if (idx >= questions.length) {
      state.quizHistory.push({ date: today(), type, score, total: questions.length });
      saveState();
      area.appendChild(el(`
        <div class="card result-banner">
          <div class="score">${score} / ${questions.length}</div>
          <p class="muted">${score === questions.length ? "全對！太厲害了 🎉" : score >= questions.length * 0.7 ? "表現不錯，答錯的題目會加入複習排程。" : "別氣餒，答錯的項目會安排優先複習。"}</p>
          <div class="btn-row" style="justify-content:center"><button class="btn" id="back">完成</button></div>
        </div>`));
      area.querySelector("#back").onclick = onDone;
      return;
    }
    const q = questions[idx];
    const card = el(`
      <div class="card">
        <div class="progress-bar"><div class="fill" style="width:${(idx / questions.length) * 100}%"></div></div>
        <p class="muted">第 ${idx + 1} / ${questions.length} 題</p>
        ${renderQ(q)}
        <div class="options"></div>
        <div class="exp-slot"></div>
      </div>`);
    area.appendChild(card);
    const optWrap = card.querySelector(".options");

    q.options.forEach((opt, i) => {
      const btn = el(`<button class="opt">${esc(opt)}</button>`);
      btn.onclick = () => {
        const ok = i === q.answer;
        if (ok) score++;
        onAnswer(q, ok);
        optWrap.querySelectorAll(".opt").forEach((b, j) => {
          b.disabled = true;
          if (j === q.answer) b.classList.add("correct");
          else if (j === i) b.classList.add("wrong");
        });
        card.querySelector(".exp-slot").appendChild(el(`
          <div class="explanation">${renderExp(q)}
            <div class="btn-row"><button class="btn" id="next-q">${idx + 1 >= questions.length ? "看結果" : "下一題"}</button></div>
          </div>`));
        card.querySelector("#next-q").onclick = () => { idx++; next(); };
        card.querySelector("#next-q").focus();
      };
      optWrap.appendChild(btn);
    });
  }
  next();
  area.scrollIntoView({ behavior: "smooth" });
}

/* ---------- 讀解 ---------- */
function renderReading() {
  const wrap = el(`<div>
    <div class="card">
      <h2>讀解練習</h2>
      <p class="muted">閱讀文章後回答理解問題，每題附解析。</p>
    </div>
    <div class="item-list" id="r-list"></div>
    <div id="r-area"></div>
  </div>`);
  main.appendChild(wrap);
  const listEl = wrap.querySelector("#r-list");

  READING_DATA.forEach(r => {
    const done = state.readingDone[r.id];
    const row = el(`
      <div class="item-row">
        <div class="head">
          <span class="w">${esc(r.title)}</span>
          <span>${done !== undefined ? `<span class="badge">已完成 ${done}/${r.questions.length}</span>` : `<span class="m">${r.questions.length} 題</span>`}</span>
        </div>
      </div>`);
    row.onclick = () => startReading(r);
    listEl.appendChild(row);
  });
}

function startReading(r) {
  const area = document.getElementById("r-area");
  area.innerHTML = "";
  let idx = 0, score = 0;

  const card = el(`
    <div class="card">
      <div class="reading-title"><h2>${esc(r.title)}</h2></div>
      <div class="passage">${esc(r.passage)}</div>
      <div id="rq"></div>
    </div>`);
  area.appendChild(card);
  const rq = card.querySelector("#rq");

  function next() {
    rq.innerHTML = "";
    if (idx >= r.questions.length) {
      state.readingDone[r.id] = score;
      saveState();
      rq.appendChild(el(`
        <div class="result-banner">
          <div class="score">${score} / ${r.questions.length}</div>
          <div class="btn-row" style="justify-content:center"><button class="btn" id="r-back">回讀解列表</button></div>
        </div>`));
      rq.querySelector("#r-back").onclick = () => nav("reading");
      return;
    }
    const q = r.questions[idx];
    const qEl = el(`
      <div>
        <div class="quiz-q"><b>問${idx + 1}</b>　${esc(q.question)}</div>
        <div class="options"></div>
        <div class="exp-slot"></div>
      </div>`);
    rq.appendChild(qEl);
    const optWrap = qEl.querySelector(".options");
    q.options.forEach((opt, i) => {
      const btn = el(`<button class="opt">${i + 1}．${esc(opt)}</button>`);
      btn.onclick = () => {
        if (i === q.answer) score++;
        optWrap.querySelectorAll(".opt").forEach((b, j) => {
          b.disabled = true;
          if (j === q.answer) b.classList.add("correct");
          else if (j === i) b.classList.add("wrong");
        });
        qEl.querySelector(".exp-slot").appendChild(el(`
          <div class="explanation"><span class="tag">解析</span>　${esc(q.explanation)}
            <div class="btn-row"><button class="btn" id="r-next">${idx + 1 >= r.questions.length ? "看結果" : "下一題"}</button></div>
          </div>`));
        qEl.querySelector("#r-next").onclick = () => { idx++; next(); };
      };
      optWrap.appendChild(btn);
    });
    qEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  next();
  card.scrollIntoView({ behavior: "smooth" });
}

/* ---------- 聽力 ---------- */
let ttsVoice;
function pickJaVoice() {
  const vs = ("speechSynthesis" in window) ? speechSynthesis.getVoices().filter(v => v.lang.replace("_", "-").startsWith("ja")) : [];
  ttsVoice = vs.find(v => /Nanami|Google|Keita|Haruka|Ichiro|Kyoko|Otoya/i.test(v.name)) || vs[0] || null;
  return ttsVoice;
}
if ("speechSynthesis" in window) {
  pickJaVoice();
  speechSynthesis.onvoiceschanged = pickJaVoice;
}

// 依序唸出：情境說明 → 對話（男聲降調、女聲升調）→ 問題
function speakItem(item, rate, onEnd) {
  speechSynthesis.cancel();
  const parts = [{ text: item.intro, pitch: 1 }];
  item.script.split("\n").map(l => l.trim()).filter(Boolean).forEach(line => {
    const m = line.match(/^(男|女|先生|学生|店員|客|アナウンス|専門家)[:：](.*)$/);
    const speaker = m ? m[1] : "";
    parts.push({
      text: m ? m[2] : line,
      pitch: /男|先生|店員/.test(speaker) ? 0.8 : /女|客/.test(speaker) ? 1.2 : 1,
    });
  });
  parts.push({ text: item.question, pitch: 1 });
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p.text);
    u.lang = "ja-JP";
    if (ttsVoice) u.voice = ttsVoice;
    u.rate = rate;
    u.pitch = p.pitch;
    if (i === parts.length - 1 && onEnd) u.onend = onEnd;
    speechSynthesis.speak(u);
  });
}

function renderListening() {
  const supported = "speechSynthesis" in window;
  const hasJa = supported && !!pickJaVoice();
  const notice = !supported
    ? `<p class="muted">⚠️ 這個瀏覽器不支援語音合成，無法播放音檔。請改用 Chrome、Edge 或 Safari。</p>`
    : !hasJa
      ? `<p class="muted">⚠️ 找不到日文語音。手機通常內建日文語音可直接使用；電腦版請先在系統設定安裝日文語音（Windows：設定→時間與語言→語音→新增日文），或改用手機開啟本網站。安裝後重新整理即可。</p>`
      : `<p class="muted">依 JLPT 聴解形式出題：先聽情境說明與對話，作答後才會顯示原稿與解析。</p>`;

  const wrap = el(`<div>
    <div class="card">
      <h2>聽力測驗</h2>
      ${notice}
      <div class="btn-row" style="align-items:center">
        <label class="muted">語速：
          <select id="l-rate" style="font-family:inherit;padding:4px 8px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:var(--ink)">
            <option value="0.85">稍慢（0.85x）</option>
            <option value="1" selected>正常（1x）</option>
          </select>
        </label>
      </div>
    </div>
    <div class="item-list" id="l-list"></div>
    <div id="l-area"></div>
  </div>`);
  main.appendChild(wrap);
  const listEl = wrap.querySelector("#l-list");

  LISTENING_DATA.forEach(item => {
    const done = state.listeningDone[item.id];
    const row = el(`
      <div class="item-row">
        <div class="head">
          <span><span class="w">${esc(item.id.replace("l", "第 ").replace(/^第 0*/, "第 "))} 題</span> <span class="m">${esc(item.type)}</span></span>
          <span>${done !== undefined ? `<span class="badge">${done ? "答對 ✓" : "已作答"}</span>` : `<span class="m">未作答</span>`}</span>
        </div>
      </div>`);
    row.onclick = () => startListening(item);
    listEl.appendChild(row);
  });
}

function startListening(item) {
  const area = document.getElementById("l-area");
  area.innerHTML = "";
  const rate = parseFloat(document.getElementById("l-rate").value) || 1;

  const card = el(`
    <div class="card">
      <p class="muted">${esc(item.type)}</p>
      <div class="quiz-q">${esc(item.intro)}</div>
      <div class="btn-row">
        <button class="btn" id="l-play">▶ 播放</button>
        <button class="btn secondary" id="l-replay" disabled>↻ 再聽一次</button>
      </div>
      <p class="muted" id="l-status" style="margin-top:8px"></p>
      <div style="margin-top:16px">
        <div class="quiz-q" style="font-size:1rem"><b>${esc(item.question)}</b></div>
        <div class="options"></div>
        <div class="exp-slot"></div>
      </div>
    </div>`);
  area.appendChild(card);

  const status = card.querySelector("#l-status");
  const playBtn = card.querySelector("#l-play");
  const replayBtn = card.querySelector("#l-replay");
  const play = () => {
    status.textContent = "播放中…";
    playBtn.disabled = true;
    replayBtn.disabled = true;
    speakItem(item, rate, () => {
      status.textContent = "播放結束，請作答。";
      replayBtn.disabled = false;
    });
  };
  playBtn.onclick = play;
  replayBtn.onclick = play;

  const optWrap = card.querySelector(".options");
  item.options.forEach((opt, i) => {
    const btn = el(`<button class="opt">${i + 1}．${esc(opt)}</button>`);
    btn.onclick = () => {
      speechSynthesis.cancel();
      const ok = i === item.answer;
      state.listeningDone[item.id] = ok ? 1 : 0;
      saveState();
      optWrap.querySelectorAll(".opt").forEach((b, j) => {
        b.disabled = true;
        if (j === item.answer) b.classList.add("correct");
        else if (j === i) b.classList.add("wrong");
      });
      card.querySelector(".exp-slot").appendChild(el(`
        <div class="explanation">
          <span class="tag">解析</span>　${esc(item.explanation)}
          <div style="margin-top:10px;border-top:1px dashed var(--line);padding-top:10px">
            <b>原稿</b><br><span style="white-space:pre-wrap">${esc(item.script)}</span><br>
            <span class="muted">${esc(item.scriptTr)}</span>
          </div>
          <div class="btn-row"><button class="btn" id="l-back">回題目列表</button></div>
        </div>`));
      card.querySelector("#l-back").onclick = () => nav("listening");
    };
    optWrap.appendChild(btn);
  });
  card.scrollIntoView({ behavior: "smooth" });
}

/* ---------- 啟動 ---------- */
nav("home");
