# Sci ’29 Bingo Board

A 90-ball bingo caller board styled like an electronic scoreboard. All numbers
1–90 sit behind backlit lenses with seven-segment LED digits; click a number to
call it and its teal backlight switches on. Unlit numbers show white digits, and
the number just picked is the brightest lamp on the board, ringed in purple and
pulsing so everyone can see it. The board fills the screen beside a slim side
panel with the last number, the count, recent numbers and the controls.

## Features

- Board of 1–90 in 9 rows of 10, each number a backlit lamp with LED digits
- Click a number to call it; the latest call glows, pulses and shows in the big ball
- Click a called number again to un-call it (for mistakes), or use **Undo last**
- **Draw random** picks an uncalled number for you
- **New game** clears the board
- Recent-numbers strip and a called count
- Every open browser window stays in sync live (Server-Sent Events), so you can
  click on a laptop and show the board on a projector or TV
- The game is saved to `data/state.json`, so restarting the server keeps it

## Run it

Requires Node.js 18 or newer.

```bash
npm install
npm start
```

Then open <http://localhost:3000>. Set `PORT` to use a different port.

## Project layout

```
server/index.js   Express server: static files, REST API, live updates
server/game.js    Game state (called numbers) with save/load
public/           Frontend: index.html, styles.css, app.js
```

## API

| Method | Path                | What it does                         |
| ------ | ------------------- | ------------------------------------ |
| GET    | `/api/state`        | Current game state                   |
| GET    | `/api/events`       | Live state stream (Server-Sent Events) |
| POST   | `/api/numbers/:n`   | Call number `n` (1–90)               |
| DELETE | `/api/numbers/:n`   | Un-call number `n`                   |
| POST   | `/api/draw`         | Call a random uncalled number        |
| POST   | `/api/undo`         | Remove the most recent call          |
| POST   | `/api/reset`        | Start a new game                     |

State looks like:

```json
{ "min": 1, "max": 90, "called": [17, 42, 5], "last": 5, "remaining": 87 }
```
