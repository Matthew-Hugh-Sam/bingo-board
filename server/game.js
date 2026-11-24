const fs = require("fs");
const path = require("path");

const MIN = 1;
const MAX = 50;

/**
 * Holds the state of one bingo game: the numbers called so far, in order.
 * State is saved to a JSON file so a server restart doesn't lose the game.
 */
class Game {
  constructor(file) {
    this.file = file;
    this.called = [];
    this.load();
  }

  load() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, "utf8"));
      if (Array.isArray(data.called)) {
        this.called = data.called.filter((n) => Game.isValid(n));
      }
    } catch {
      this.called = [];
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify({ called: this.called }, null, 2));
  }

  static isValid(n) {
    return Number.isInteger(n) && n >= MIN && n <= MAX;
  }

  state() {
    return {
      min: MIN,
      max: MAX,
      called: [...this.called],
      last: this.called.length ? this.called[this.called.length - 1] : null,
      remaining: MAX - MIN + 1 - this.called.length,
    };
  }

  /** Call a number. Calling one that is already called makes it the latest again. */
  call(n) {
    if (!Game.isValid(n)) throw new RangeError(`Number must be between ${MIN} and ${MAX}`);
    this.called = this.called.filter((x) => x !== n);
    this.called.push(n);
    this.save();
  }

  /** Remove a number from the called list (e.g. it was clicked by mistake). */
  uncall(n) {
    if (!Game.isValid(n)) throw new RangeError(`Number must be between ${MIN} and ${MAX}`);
    this.called = this.called.filter((x) => x !== n);
    this.save();
  }

  /** Undo the most recent call. */
  undo() {
    this.called.pop();
    this.save();
  }

  /** Pick a random number that hasn't been called yet. Returns null when all are called. */
  draw() {
    const set = new Set(this.called);
    const pool = [];
    for (let n = MIN; n <= MAX; n++) if (!set.has(n)) pool.push(n);
    if (!pool.length) return null;
    const n = pool[Math.floor(Math.random() * pool.length)];
    this.call(n);
    return n;
  }

  reset() {
    this.called = [];
    this.save();
  }
}

module.exports = { Game, MIN, MAX };
