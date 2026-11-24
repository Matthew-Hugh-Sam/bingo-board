const board = document.getElementById("board");
const lastBall = document.getElementById("lastBall");
const calledCount = document.getElementById("calledCount");
const historyEl = document.getElementById("history");
const statusEl = document.getElementById("status");
const drawBtn = document.getElementById("drawBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");

const cells = new Map();
let state = { called: [], last: null, remaining: 90 };

// Build the 90 cells once: 9 rows of 10 (1–10, 11–20, … 81–90).
for (let n = 1; n <= 90; n++) {
  const cell = document.createElement("button");
  cell.className = "cell";
  cell.textContent = n;
  cell.dataset.n = n;
  cell.setAttribute("role", "gridcell");
  cell.setAttribute("aria-pressed", "false");
  board.appendChild(cell);
  cells.set(n, cell);
}

function render(next) {
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
  if (state.last !== prevLast && state.last !== null) {
    const cell = cells.get(state.last);
    cell.classList.remove("fresh");
    void cell.offsetWidth; // restart the animation
    cell.classList.add("fresh");

    lastBall.classList.remove("pop");
    void lastBall.offsetWidth;
    lastBall.classList.add("pop");
  }

  lastBall.textContent = state.last ?? "–";
  lastBall.classList.toggle("empty", state.last === null);
  calledCount.textContent = state.called.length;

  // The five numbers called before the latest one, newest first.
  historyEl.innerHTML = "";
  state.called.slice(0, -1).slice(-5).reverse().forEach((n) => {
    const li = document.createElement("li");
    li.textContent = n;
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
