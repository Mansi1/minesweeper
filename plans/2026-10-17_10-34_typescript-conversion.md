# Plan: browser-only minesweeper in TypeScript

Tick `- [x]` on a milestone when its proof passes, THEN run `verify` on that milestone's scope.

Requirements, as the human stated them:
1. Convert the code to TypeScript.
2. Remove Electron. The game must be playable in a browser.

## Current state (VERIFIED by reading every tracked file)

- An Electron 11.0.2 app (`yarn.lock`, `node_modules/electron/package.json`). `package.json` has one script, `start: electron .`, and its only dependency is `electron`. There is no build step, no tests, no lint, and no `.agents/` or `Makefile`.
- `app.js` (the window) and `preload.js` (an empty `DOMContentLoaded` handler) are the only Electron code. The game itself uses no Node or Electron APIs, so it runs in a browser once it is served.
- `index.html` holds all the CSS in an inline `<style>`. That CSS references `fonts/*.ttf` and `src/img/*.svg` with `url()`. The page loads `src/Block.js` and `src/FieldMatrix.js` as classic scripts that define global classes. An inline script calls `new FieldMatrix(50, 50, 0.15)`. It also loads the Ko-fi widget from `storage.ko-fi.com`. The `<title>` is `Document`; Electron set the window title to `Minesweeper`.
- A strict check (`tsc --checkJs --strict`, TypeScript 5.6.3) finds 30+ errors. They are all implicit `any`, possibly-null `getElementById` results, the `el.block` expando, and the untyped mine map `{}`.
- Bun 1.3.9 is installed.

### Bun build probes (run in the scratchpad on a copy of HEAD)
- VERIFIED: `bun build ./index.html --outdir out` compiles `<script type="module" src="x.ts">` into one hashed JS file and rewrites the tag to point at it.
- VERIFIED: `url()` references inside an inline `<style>` are left untouched, so they would 404 from `dist/`. In a CSS file linked with `<link rel="stylesheet">`, the font and SVGs are inlined into the bundled CSS as `data:` URIs. So the CSS moves into its own file.
- VERIFIED: the current classic `<script>` tags produce a 0 KB bundle under `bun build`. They have to become ES modules.

### Defects found while reading (out of scope; listed so the conversion doesn't hide them)
- `FieldMatrix.onClick`: a click on `#root` itself, not on a cell, has no `evt.target.block`, so `block.index` throws. Strict TS forces a guard. The guard keeps today's behaviour, which is to ignore the click.
- `#markers` is never updated. There is no win detection. Losing only shows `alert('you lose')`. The `setInterval` timer is never cleared.

## Decision for the human

**Package manager.** With Electron gone, `typescript` is the only dependency left, and the build already runs on `bun build`. Recommendation: move to bun for installs too (`bun install`, delete `yarn.lock`). This plan assumes bun. If you want to keep yarn, the only change is that `yarn` runs the install and the scripts; the build still calls `bun build`.

## Steps (in dependency order)

- [x] **0. Layout and removing Electron.**
  - Run `vae.py init --repo .`.
  - Delete `app.js`, `preload.js`, the `electron` devDependency, and `"main"` from `package.json`.
  - Add `typescript` (pinned) and `@playwright/test` (pinned) as devDependencies, with `packageManager: bun@1.3.9`.
  - Add `tsconfig.json`: `strict`, `target es2020`, `lib [es2020, dom]`, `module esnext`, `noEmit`.
  - Add `dist/` to `.gitignore`.

  Proof: `make lint` runs `tsc --noEmit` and `bunx oxlint --deny-warnings` without errors. `grep -ri electron` outside `node_modules` and `plans/` returns nothing (a `VERIFY.py` rule).
- [x] **1. Pure core `src/core.ts`.** Move the logic that doesn't touch the page out of the classes, unchanged:
  - `neighbours(index, width, height): number[]`, from `Block.calculateNeighbours`.
  - `placeMines(width, height, ratio, safe: number[], rand = Math.random): Set<number>`, from `FieldMatrix.calculateMines` minus the DOM and timer code.
  - `countAdjacent(index, mines, width, height): number`.
  - `formatClock(elapsedMs): [m10, m1, s10, s1]`, from `calculateDate`.

  Why this module exists: the game rules can then be tested against real inputs without a DOM. That beats typing the classes as they are, which leaves nothing testable.
  Contract: `core.ts` uses no `document` or `window`. Checked by a `VERIFY.py` rule.
  Proof (`make test` → `bun test`), with expected values taken from the current code:
  - Corner, edge, and interior cells have 3, 5, and 8 neighbours.
  - `placeMines(50,50,0.15,safe)` returns 375 mines and none of them is in `safe`. A seeded `rand` always gives the same set.
  - `formatClock(754_000)` returns `[1,2,3,4]`.
- [x] **2. `src/Block.ts`.**
  - Type the fields. `isMine: boolean` and `count: number` start as `false`/`0`, not undefined.
  - Replace the `el.block` expando with a module-level `WeakMap<HTMLElement, Block>` exposed as `blockOf(el)`. That beats widening `HTMLDivElement`'s global type.
  - Use `el.id = String(index)` and `textContent = String(count)`, and call `core.neighbours`.
  - Export the class.

  Contract: `FieldMatrix` looks cells up through `blockOf`. Checked by `tsc`.
- [x] **3. `src/FieldMatrix.ts`.** Add a typed `requireEl(id)` that throws if the element is missing, in place of the possibly-null lookups. Guard against a click whose target has no `blockOf` (defect 1). Call `core.placeMines`, `core.countAdjacent`, and `core.formatClock`. Export the class.
- [x] **4. Page and build.**
  - Move the inline `<style>` to `src/style.css` with paths relative to it (`../fonts/…`, `img/…`) and link it from `index.html`.
  - Replace the two classic scripts and the inline bootstrap with `<script type="module" src="./src/main.ts">`, where `main.ts` does `new FieldMatrix(50, 50, 0.15)`.
  - Change `<title>` to `Minesweeper`. Leave the Ko-fi tags as they are.
  - Delete `src/*.js`.
  - Scripts:
    - `build`: `bun build ./index.html --outdir dist --minify`
    - `dev`: `bun ./index.html`, Bun's dev server (VERIFIED: Bun 1.3.9 starts it on `http://localhost:3000/`)
    - `start`: build, then serve `dist/` with `scripts/serve.ts`, a short `Bun.serve` that maps request paths to `Bun.file("dist"+path)` and returns 404 for anything else. Serving is needed because Chromium blocks the bundled CSS and JS over `file://` (VERIFIED: Playwright on `file://…/dist/index.html` logs a CORS error and renders 0 cells).
  - `make start`/`stop` follow the plugin layout (pid in `tmp/`, log in `var/log/`).

  Proof: `bun run build` exits 0. `dist/` holds `index.html`, one JS file, and one CSS file containing `data:font/ttf` and `data:image/svg+xml`. Step 5 checks behaviour.
- [x] **5. e2e (`make e2e`).** Build, `make start`, then drive Playwright Chromium (`bunx playwright install chromium`) against the served `dist/`:
  - The page title is `Minesweeper` and the grid has 2500 cells.
  - The first click reveals the cell and its neighbours without hitting a mine.
  - Right-click toggles `.marked` on a covered cell.
  - `#mines` shows 375.
  - The timer advances.
  - The fonts load (`document.fonts.check("12px mine-number")`).
  - Fail on console errors and failed requests. Exempt `storage.ko-fi.com`, an external widget that is unavailable offline. Write the report to `output/`.
- [x] **6. Docs and gate.**
  - Rewrite `README.md`: browser requirement, `bun install && bun run dev`, `bun run build` producing static files in `dist/`.
  - Add a short `ARCH.md` on why the pure core is split out and why there's no bundler beyond `bun build`.
  - `make verify` runs lint, test, coverage (≥60%), and e2e. Then run `vae.py gate`.

## Risk / rollback
The Electron and JS files stay in git history. Rolling back means reverting the branch. Hosting `dist/` (for example on GitHub Pages) is a separate follow-up and not part of this plan.

## Outcome (differences from the plan)
- `core.ts` also exports `mineCount`, because the status panel and `placeMines` both need the same number. `placeMines` stops when it runs out of candidate cells, where the old code would have stored `undefined`.
- Vite replaces `bun build` and `scripts/serve.ts` on request: `vite` for development, `vite build`, and `vite preview` for `make start`. `serve.ts` and its test are deleted.
- Not covered by e2e: losing (the `alert`) and clicking a number to reveal its neighbours. Neither can be triggered without knowing where the random mines are.
