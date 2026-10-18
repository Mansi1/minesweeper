# minesweeper

Minesweeper in the browser, written in TypeScript. There is nothing to install to play it, only static files to serve.

Play it at https://mansi1.github.io/minesweeper/ (published by `.github/workflows/pages.yml`).

## TL;DR

A start screen lets you pick a level: Easy (9×9, 10 mines, 1 heart), Medium (16×16, 40, 2 hearts), Hard (30×16, 99, 3 hearts) or Huge (50×50, 375, 3 hearts). The status panel stays hidden while this menu is open. The first click never hits a mine, because mines are placed after it, away from that cell and its neighbours.

- Left-click reveals a cell. A cell with no adjacent mines also reveals its neighbours.
- Right-click toggles a flag on a covered cell.
- Every revealed mine costs half a heart; the mine stays visible and play goes on. The mine that takes the last half ends the game (the second on Easy, the sixth on Hard): the board locks, the timer stops, and a wave spreads out from that mine (shown in red) that pops up every remaining mine within 1.5 s. Then the "Game over" screen appears. With the system setting "reduce motion", the mines appear at once without animation.
- Revealing every safe cell wins: a golden wave bounces across every cell from your last click, the remaining mines get flagged and jump, the board glows, confetti rains down, and sparkles plus a rising fanfare play. Then the "You win!" screen appears. With "reduce motion" the mines just get flagged and the screen comes after the fanfare.
- During a game, **Restart** in the status panel starts a fresh board of the same level and **New game** opens the level menu; the abandoned game's clock stops.
- Both end screens show the level and your time, with **Play again** (same level) and **Change level** (back to the start screen). There are no browser alerts.
- Clicking a revealed number reveals its other neighbours once its flags plus its already revealed mines match the number.
- The status panel shows the mine count, the number of flags, the field count, the hearts left, and an mm:ss timer that starts on the first click.
- Sound: a click when you reveal, a blip for flags, an explosion for a mine, and at game over a big boom, crackles along the wave and a short sad tune before the end screen; a win plays a rising tune. The **Sound: ON/OFF** button in the status panel mutes it, and the browser remembers the choice.

## Quick start

Requires [bun](https://bun.sh) 1.3.9 (pinned in `package.json`).

```bash
bun install
bun run dev
```

Vite's dev server prints `http://localhost:5173/`. Open it and click any cell.

## Usage

| Command | Result |
|---|---|
| `bun run dev` | Vite dev server on port 5173 |
| `bun run build` | Static site in `dist/` with relative paths: `index.html` plus hashed JS, CSS and font files in `dist/assets/` (the SVG icons are embedded in the CSS) |
| `bun run preview` | Serves the built `dist/` with `vite preview` |

Any static host can serve `dist/` over HTTP, at the site root or under a subpath, because `bun run build` uses `vite build --base ./`. Opening `dist/index.html` from disk won't work, because Chromium blocks the bundled CSS and JS on `file://`.

## Configuration

| Key | Meaning | Default |
|---|---|---|
| `PORT` | Port `make start` serves the build on (`vite preview`) | `8080` |

## How it works

`index.html` loads `src/style.css` and `src/main.ts`. `vite build` bundles both into `dist/`. The game rules live in `src/core.ts`, which doesn't touch the DOM. `src/Block.ts` and `src/FieldMatrix.ts` draw the grid and handle clicks. [ARCH.md](ARCH.md) explains the split.

## Deployment

`.github/workflows/pages.yml` builds `dist/` and publishes it to GitHub Pages. It runs after a passing `verify` run on `master`, or by hand (`workflow_dispatch`). This needs the repository's Pages source set to **GitHub Actions**:

```bash
gh api -X PUT repos/Mansi1/minesweeper/pages -f build_type=workflow
```

## Development

```bash
make setup && make verify
```

`make verify` runs the strict type-check and lint, the unit tests in `src/core.test.ts` (`bun test`), coverage, and the Playwright tests in `e2e/` against the served build.

## License

MIT, as declared in `package.json`.
