const board = document.getElementById("board");
const lastBall = document.getElementById("lastBall");
const calledCount = document.getElementById("calledCount");
const historyEl = document.getElementById("history");
const statusEl = document.getElementById("status");
const drawBtn = document.getElementById("drawBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");

// ---------------------------------------------------------------------------
// Seven-segment LED digits, drawn as SVG.
// Every digit position shows a faint "8" (the unlit segments) behind the lit ones.
// ---------------------------------------------------------------------------
const DW = 48;  // digit width
const DH = 88;  // digit height
const GAP = 12; // space between digits
const T = 10;   // segment thickness

function hSeg(y, x0, x1) {
  const h = T / 2;
  return `M${x0} ${y}L${x0 + h} ${y - h}H${x1 - h}L${x1} ${y}L${x1 - h} ${y + h}H${x0 + h}Z`;
}
function vSeg(x, y0, y1) {
  const h = T / 2;
  return `M${x} ${y0}L${x + h} ${y0 + h}V${y1 - h}L${x} ${y1}L${x - h} ${y1 - h}V${y0 + h}Z`;
}

const SEGMENTS = (() => {
  const l = 6, r = DW - 6, t = 6, b = DH - 6, m = DH / 2, g = 2;
  return {
    a: hSeg(t, l + g, r - g),
    b: vSeg(r, t + g, m - g),
    c: vSeg(r, m + g, b - g),
    d: hSeg(b, l + g, r - g),
    e: vSeg(l, m + g, b - g),
    f: vSeg(l, t + g, m - g),
    g: hSeg(m, l + g, r - g),
  };
})();

const DIGITS = {
  0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg",
  5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg", " ": "", "-": "g",
};
const ALL = Object.values(SEGMENTS).join("");

/** An SVG showing `text` (digits, spaces or "-") as slanted seven-segment LED digits. */
function ledDigits(text) {
  const chars = [...String(text)];
  const width = chars.length * DW + (chars.length - 1) * GAP;
  const slant = 14; // the skew pushes the bottom left by about this much
  const digits = chars
    .map((ch, i) => {
      const lit = [...(DIGITS[ch] ?? "")].map((s) => SEGMENTS[s]).join("");
      return `<g transform="translate(${i * (DW + GAP)} 0)"><path class="off" d="${ALL}"/><path class="on" d="${lit}"/></g>`;
    })
    .join("");
  return `<svg class="seg" viewBox="${-slant - 2} 0 ${width + slant + 4} ${DH}" aria-hidden="true"><g transform="skewX(-8)">${digits}</g></svg>`;
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------
const COLS = 10;
const cells = new Map();
let state = { called: [], last: null, remaining: 0 };
let built = "";

// Build one lamp per number in rows of 10 (1–10, 11–20, …). The range comes
// from the server, so the board always matches the game.
function buildBoard(min, max) {
  const key = `${min}-${max}`;
  if (built === key) return;
  built = key;
  board.innerHTML = "";
  cells.clear();
  const rows = Math.ceil((max - min + 1) / COLS);
  board.style.setProperty("--rows", rows);
  board.style.setProperty("--ratio", ((COLS * 1.35) / rows).toFixed(3));
  board.setAttribute("aria-label", `Bingo board, numbers ${min} to ${max}`);
  document.querySelector(".of").textContent = `/ ${max - min + 1}`;
  for (let n = min; n <= max; n++) {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.innerHTML = ledDigits(n);
    cell.dataset.n = n;
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-pressed", "false");
    cell.setAttribute("aria-label", String(n));
    board.appendChild(cell);
    cells.set(n, cell);
  }
}

function render(next) {
  if (next.min != null && next.max != null) buildBoard(next.min, next.max);
  const prevLast = state.last;
  state = next;
  const called = new Set(state.called);

  for (const [n, cell] of cells) {
    const isCalled = called.has(n);
    cell.classList.toggle("called", isCalled);
    cell.classList.toggle("latest", n === state.last);
    cell.setAttribute("aria-pressed", String(isCalled));
    cell.setAttribute("aria-label", isCalled ? `${n}, called` : `${n}`);
  }

  // Replay the "just picked" animation only when the latest number changes.
  if (state.last !== prevLast && state.last !== null && cells.has(state.last)) {
    const cell = cells.get(state.last);
    cell.classList.remove("fresh");
    void cell.offsetWidth; // restart the animation
    cell.classList.add("fresh");

    lastBall.classList.remove("pop");
    void lastBall.offsetWidth;
    lastBall.classList.add("pop");
  }

  lastBall.innerHTML = ledDigits(state.last === null ? "--" : String(state.last).padStart(2, " "));
  lastBall.setAttribute("aria-label", state.last === null ? "No number called yet" : `Last number ${state.last}`);
  lastBall.classList.toggle("empty", state.last === null);
  calledCount.innerHTML = ledDigits(String(state.called.length).padStart(2, " "));
  calledCount.setAttribute("aria-label", `${state.called.length} of ${state.called.length + state.remaining} called`);

  // The ten numbers called before the latest one, newest first.
  historyEl.innerHTML = "";
  state.called.slice(0, -1).slice(-10).reverse().forEach((n) => {
    const li = document.createElement("li");
    li.innerHTML = ledDigits(String(n).padStart(2, " "));
    li.setAttribute("aria-label", String(n));
    historyEl.appendChild(li);
  });

  drawBtn.disabled = state.remaining === 0;
  undoBtn.disabled = state.called.length === 0;
}

async function api(method, url) {
  statusEl.textContent = "";
  try {
    const res = await fetch(url, { method });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || res.statusText);
    render(body);
  } catch (err) {
    statusEl.textContent = err.message;
  }
}

board.addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (!cell) return;
  const n = Number(cell.dataset.n);
  const isCalled = state.called.includes(n);
  api(isCalled ? "DELETE" : "POST", `/api/numbers/${n}`);
});

drawBtn.addEventListener("click", () => api("POST", "/api/draw"));
undoBtn.addEventListener("click", () => api("POST", "/api/undo"));
resetBtn.addEventListener("click", () => {
  if (confirm("Start a new game? All called numbers will be cleared.")) api("POST", "/api/reset");
});

// Keep every open screen in sync with the server.
function connect() {
  const events = new EventSource("/api/events");
  events.onmessage = (e) => render(JSON.parse(e.data));
  events.onerror = () => {
    statusEl.textContent = "Reconnecting…";
    events.close();
    setTimeout(connect, 2000);
  };
  events.onopen = () => { statusEl.textContent = ""; };
}

fetch("/api/state").then((r) => r.json()).then(render).catch(() => {});
connect();
