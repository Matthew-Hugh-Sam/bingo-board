const path = require("path");
const express = require("express");
const { Game } = require("./game");

const PORT = Number(process.env.PORT) || 3000;
const game = new Game(path.join(__dirname, "..", "data", "state.json"));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// --- Live updates (Server-Sent Events) -------------------------------------
// Every open board subscribes here, so a second screen (e.g. a projector)
// lights up the same number the caller just clicked.
const clients = new Set();

function broadcast() {
  const payload = `data: ${JSON.stringify(game.state())}\n\n`;
  for (const res of clients) res.write(payload);
}

app.get("/api/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  res.write(`data: ${JSON.stringify(game.state())}\n\n`);
  clients.add(res);
  const ping = setInterval(() => res.write(": ping\n\n"), 25000);
  req.on("close", () => {
    clearInterval(ping);
    clients.delete(res);
  });
});

// --- REST API ---------------------------------------------------------------
function respond(res) {
  broadcast();
  res.json(game.state());
}

function parseNumber(req, res) {
  const n = Number(req.params.n);
  if (!Game.isValid(n)) {
    res.status(400).json({ error: "Number must be an integer between 1 and 90" });
    return null;
  }
  return n;
}

app.get("/api/state", (req, res) => res.json(game.state()));

app.post("/api/numbers/:n", (req, res) => {
  const n = parseNumber(req, res);
  if (n === null) return;
  game.call(n);
  respond(res);
});

app.delete("/api/numbers/:n", (req, res) => {
  const n = parseNumber(req, res);
  if (n === null) return;
  game.uncall(n);
  respond(res);
});

app.post("/api/draw", (req, res) => {
  if (game.draw() === null) return res.status(409).json({ error: "All numbers have been called" });
  respond(res);
});

app.post("/api/undo", (req, res) => {
  game.undo();
  respond(res);
});

app.post("/api/reset", (req, res) => {
  game.reset();
  respond(res);
});

app.listen(PORT, () => {
  console.log(`Bingo board running at http://localhost:${PORT}`);
});
