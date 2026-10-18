import { expect, test, type Page } from "@playwright/test";

// HYPOTHESIS: the third-party Ko-fi widget is unreachable on offline CI, so only its errors are exempt; everything else must load cleanly.
const isKofi = (text: string) => /ko-fi\.com|kofiWidgetOverlay/.test(text);

let problems: string[] = [];
let dialogs: string[] = [];

test.beforeEach(async ({ page }) => {
  problems = [];
  dialogs = [];
  page.on("console", (m) => m.type() === "error" && !isKofi(m.text() + m.location().url) && problems.push(m.text()));
  page.on("pageerror", (e) => !isKofi(e.message) && problems.push(e.message));
  page.on("requestfailed", (r) => !isKofi(r.url()) && problems.push(`request failed: ${r.url()}`));
  page.on("response", (r) => r.status() >= 400 && !isKofi(r.url()) && problems.push(`${r.status()} ${r.url()}`));
  page.on("dialog", (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await page.goto("/");
});

test.afterEach(() => {
  expect(problems).toEqual([]);
  // the end of a game is a page screen, never a browser alert
  expect(dialogs).toEqual([]);
});

// Picks a level on the start screen; the board appears behind it.
const startGame = async (page: Page, level = "Huge") => {
  await page.locator("#start").getByRole("button", { name: new RegExp(`^${level}`) }).click();
  await expect(page.locator("#start")).not.toBeVisible();
};

const endScreen = (page: Page) => page.locator("#end");

test("the start screen offers every level and starts the chosen one", async ({ page }) => {
  await expect(page.locator("#start")).toBeVisible();
  await expect(page.locator("#start-title")).toHaveText("Minesweeper");
  await expect(page.locator("#levels button")).toHaveText([/^Easy.*9 × 9 · 10 mines · 1 heart$/, /^Medium.*2 hearts$/, /^Hard.*3 hearts$/, /^Huge.*3 hearts$/]);
  // the status panel stays hidden while the menu is open
  await expect(page.locator(".status")).not.toBeVisible();
  // Escape must not leave the player without a game
  await page.keyboard.press("Escape");
  await expect(page.locator("#start")).toBeVisible();
  await startGame(page, "Easy");
  await expect(page.locator(".status")).toBeVisible();
  await expect(page.locator("#root .block.covered")).toHaveCount(81);
  await expect(page.locator("#mines")).toHaveText("10");
  expect(await hearts(page)).toEqual(["full"]);
  // a small board fits the window: no scrollbar from the status panel's top spacing
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
});

test("easy has one heart: the second mine ends the game", async ({ page }) => {
  await startGame(page, "Easy");
  await revealMines(page, 2);
  expect(await hearts(page)).toEqual(["empty"]);
  await expect(endScreen(page)).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#end-title")).toHaveText("Game over");
});

test("the favicon is the mine icon and loads from the build", async ({ page }) => {
  const href = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(href).toMatch(/mine.*\.svg$/);
  const icon = await page.request.get(new URL(href!, page.url()).href);
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toContain("image/svg+xml");
});

test("page renders the 50x50 grid with its fonts", async ({ page }) => {
  await startGame(page);
  await expect(page).toHaveTitle("Minesweeper");
  await expect(page.locator("#root .block")).toHaveCount(2500);
  await expect(page.locator("#root .block.covered")).toHaveCount(2500);
  const loaded = await page.evaluate(async () => {
    const faces = [...(await document.fonts.load("12px mine-number")), ...(await document.fonts.load("12px mine-counter"))];
    return faces.map((f) => f.status);
  });
  expect(loaded).toEqual(["loaded", "loaded"]);
});

test("first click is safe, starts the status panel and the timer", async ({ page }) => {
  await startGame(page);
  const cell = page.locator("#root .block").nth(1275);
  await cell.click();
  await expect(cell).not.toHaveClass(/covered/);
  await expect(page.locator("#root .block.mine")).toHaveCount(0);
  // the clicked cell's neighbours are mine-free, so all of them are revealed too
  for (const n of [1224, 1225, 1226, 1274, 1276, 1324, 1325, 1326]) {
    await expect(page.locator(`[id="${n}"]`)).not.toHaveClass(/covered/);
  }
  await expect(page.locator("#mines")).toHaveText("375");
  await expect(page.locator("#fields")).toHaveText("2500");
  await expect(page.locator("#seconds1")).not.toHaveText("0", { timeout: 3000 });
});

test("right-click toggles a flag on a covered cell and the marker count", async ({ page }) => {
  await startGame(page);
  await page.locator("#root .block").nth(1275).click();
  const covered = page.locator("#root .block.covered").first();
  const id = await covered.getAttribute("id");
  const cell = page.locator(`[id="${id}"]`);
  await cell.click({ button: "right" });
  await expect(cell).toHaveClass(/marked/);
  await expect(page.locator("#markers")).toHaveText("1");
  await cell.click({ button: "right" });
  await expect(cell).not.toHaveClass(/marked/);
  await expect(page.locator("#markers")).toHaveText("0");
});

const hearts = (page: Page) => page.locator("#lives .heart").evaluateAll((els) => els.map((e) => e.classList[1]));

// Mine positions are random, so click covered cells in order until `n` mines are revealed.
const revealMines = async (page: Page, n: number) => {
  while ((await page.locator("#root .block.mine").count()) < n) {
    await page.locator("#root .block.covered").first().click();
  }
};

test("starts with three full hearts", async ({ page }) => {
  await startGame(page);
  expect(await hearts(page)).toEqual(["full", "full", "full"]);
  await expect(page.locator("#lives")).toHaveAttribute("aria-label", "3 of 3 lives");
});

test("each revealed mine costs half a heart without ending the game", async ({ page }) => {
  await startGame(page);
  await revealMines(page, 1);
  expect(await hearts(page)).toEqual(["full", "full", "half"]);
  await revealMines(page, 2);
  expect(await hearts(page)).toEqual(["full", "full", "empty"]);
  await expect(page.locator("#lives")).toHaveAttribute("aria-label", "2 of 3 lives");
  await expect(endScreen(page)).not.toBeVisible();
});

const animating = (page: Page) =>
  page.locator("#root").evaluate((root) => [...root.querySelectorAll(".boom")].filter((e) => e.getAnimations().length > 0).length);

test("the sixth mine ends the game: wave reveals every mine, board locked, then the game over screen", async ({ page }) => {
  await startGame(page);
  await revealMines(page, 6);
  expect(await hearts(page)).toEqual(["empty", "empty", "empty"]);
  await expect(page.locator("#root .block.hit")).toHaveCount(1);
  expect(await animating(page)).toBeGreaterThan(0);
  await expect(page.locator("#root .block.mine")).toHaveCount(375);
  // during the wave the board ignores clicks and the clock stands still
  const covered = await page.locator("#root .block.covered").count();
  await page.locator("#root .block.covered").first().click({ force: true });
  await expect(page.locator("#root .block.covered")).toHaveCount(covered);
  const clock = await page.locator(".status").innerText();
  await page.waitForTimeout(1500);
  expect(await page.locator(".status").innerText()).toBe(clock);
  await expect(endScreen(page)).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#end-title")).toHaveText("Game over");
  await expect(page.locator("#end-detail")).toHaveText(/^Huge · \d\d:\d\d$/);
});

test("play again starts a fresh board of the same level, change level goes back to the start screen", async ({ page }) => {
  await startGame(page, "Medium");
  // Medium has 2 hearts: the fourth mine ends it
  await revealMines(page, 4);
  await expect(endScreen(page)).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Play again" }).click();
  await expect(endScreen(page)).not.toBeVisible();
  await expect(page.locator("#root .block.covered")).toHaveCount(256);
  await expect(page.locator("#root .block.mine")).toHaveCount(0);
  expect(await hearts(page)).toEqual(["full", "full"]);
  await expect(page.locator("#seconds1")).toHaveText("0");
  // the new board plays: a click reveals cells again
  await page.locator("#root .block").nth(120).click();
  await expect(page.locator("#root .block.covered")).not.toHaveCount(256);

  await revealMines(page, 4);
  await expect(endScreen(page)).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Change level" }).click();
  await expect(page.locator("#start")).toBeVisible();
  await expect(page.locator(".status")).not.toBeVisible();
  await startGame(page, "Hard");
  await expect(page.locator("#root .block.covered")).toHaveCount(480);
  expect(await hearts(page)).toEqual(["full", "full", "full"]);
});

test("restart mid-game gives a fresh board of the same level; new game goes to the menu", async ({ page }) => {
  await startGame(page);
  await revealMines(page, 1);
  await expect(page.locator("#seconds1")).not.toHaveText("0", { timeout: 3000 });
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.locator("#root .block.covered")).toHaveCount(2500);
  expect(await hearts(page)).toEqual(["full", "full", "full"]);
  // the abandoned game's clock is stopped, so the new one stays at 0 until the first click
  await page.waitForTimeout(1500);
  await expect(page.locator("#seconds1")).toHaveText("0");

  await page.locator("#root .block").nth(1275).click();
  await page.getByRole("button", { name: "New game" }).click();
  await expect(page.locator("#start")).toBeVisible();
  await startGame(page, "Easy");
  await expect(page.locator("#root .block.covered")).toHaveCount(81);
  await page.waitForTimeout(1500);
  await expect(page.locator("#seconds1")).toHaveText("0");
});

// Cells whose win bounce is running right now.
const cheering = (page: Page) =>
  page.locator("#root").evaluate((root) => [...root.querySelectorAll(".cheer")].filter((e) => e.getAnimations().some((a) => a.playState === "running")).length);

test("revealing every safe cell wins: wave, flags, confetti, sparkles and fanfare, then the win screen", async ({ page }) => {
  // Math.random() = 0 places the mines on the first free cells (0..9 on Easy), so a click on the far corner clears the board
  await page.addInitScript(() => (Math.random = () => 0));
  const sounds = await countSounds(page, "Easy");
  await page.locator('[id="80"]').click();
  // every one of the 81 cells takes part in the wave, the frame glows and confetti falls
  await expect(page.locator("#root .block.cheer")).toHaveCount(81);
  expect(await cheering(page)).toBeGreaterThan(0);
  await expect(page.locator("#root-frame")).toHaveClass(/won/);
  await expect(page.locator(".confetti i")).toHaveCount(120);
  await expect(page.locator("#root .block.marked")).toHaveCount(10);
  await expect(page.locator("#markers")).toHaveText("10");
  // the screen waits until the wave is over
  await expect(endScreen(page)).not.toBeVisible();
  // one reveal click + four fanfare notes + a sparkle per 100 ms of the wave
  expect(await sounds()).toBeGreaterThan(10);
  await expect(endScreen(page)).toBeVisible({ timeout: 5000 });
  expect(await cheering(page)).toBe(0);
  await expect(page.locator("#end-title")).toHaveText("You win!");
  await expect(page.locator("#end-detail")).toHaveText(/^Easy · 00:0\d$/);
  // the confetti layer cleans itself up
  await expect(page.locator(".confetti")).toHaveCount(0, { timeout: 5000 });
});

test("with reduced motion a win skips wave and confetti", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => (Math.random = () => 0));
  await page.reload();
  await startGame(page, "Easy");
  await page.locator('[id="80"]').click();
  await expect(page.locator("#root .block.marked")).toHaveCount(10);
  expect(await cheering(page)).toBe(0);
  await expect(page.locator(".confetti")).toHaveCount(0);
  await expect(endScreen(page)).toBeVisible();
  await expect(page.locator("#end-title")).toHaveText("You win!");
});

// A revealed number whose mines are all revealed (no flags) and that still has covered neighbours, or null.
const chordCandidate = (page: Page) =>
  page.locator("#root").evaluate((root) => {
    const cell = (i: number) => root.querySelector<HTMLElement>(`[id="${i}"]`);
    const around = (i: number) => {
      const x = i % 50, y = Math.floor(i / 50), out: number[] = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((dx || dy) && nx >= 0 && nx < 50 && ny >= 0 && ny < 50) out.push(ny * 50 + nx);
      }
      return out;
    };
    for (let i = 0; i < 2500; i++) {
      const el = cell(i)!;
      const count = Number(el.innerText);
      if (el.classList.contains("covered") || !count) continue;
      const ns = around(i).map((n) => cell(n)!);
      const mines = ns.filter((n) => n.classList.contains("mine")).length;
      const covered = ns.filter((n) => n.classList.contains("covered")).map((n) => n.id);
      if (mines === count && covered.length > 0) return { id: el.id, covered };
    }
    return null;
  });

test("clicking a number counts revealed mines like flags and reveals the rest", async ({ page }) => {
  // about 1 random board in 60 has no such number within 5 mines (measured), so start over on a fresh board
  let found: Awaited<ReturnType<typeof chordCandidate>> = null;
  for (let board = 0; board < 4 && !found; board++) {
    if (board > 0) await page.reload();
    await startGame(page);
    for (let mines = 1; mines <= 5 && !found; mines++) {
      await revealMines(page, mines);
      found = await chordCandidate(page);
    }
  }
  expect(found, "no revealed number next to a revealed mine on 4 boards").not.toBeNull();
  const before = await hearts(page);
  await page.locator(`[id="${found!.id}"]`).click();
  for (const id of found!.covered) await expect(page.locator(`[id="${id}"]`)).not.toHaveClass(/covered/);
  expect(await hearts(page)).toEqual(before);
});

test("with reduced motion every mine appears at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startGame(page);
  await revealMines(page, 6);
  expect(await page.locator("#root .block.mine").count()).toBe(375);
  expect(await animating(page)).toBe(0);
  await expect(endScreen(page)).toBeVisible();
});

// Counts real Web Audio source starts (the original start still runs), then reloads so the page picks it up.
const countSounds = async (page: Page, level = "Huge") => {
  await page.addInitScript(() => {
    const w = window as unknown as { sounds: number };
    w.sounds = 0;
    // AudioBufferSourceNode (noise) overrides start, so wrap each source class that sounds use
    for (const node of [OscillatorNode, AudioBufferSourceNode]) {
      const start = node.prototype.start;
      node.prototype.start = function (this: AudioScheduledSourceNode, ...args: [number?, number?, number?]) {
        w.sounds++;
        return start.apply(this, args);
      };
    }
  });
  await page.reload();
  await startGame(page, level);
  return () => page.evaluate(() => (window as unknown as { sounds: number }).sounds);
};

test("revealing and flagging play sounds", async ({ page }) => {
  const sounds = await countSounds(page);
  await page.locator("#root .block").nth(1275).click();
  const afterReveal = await sounds();
  expect(afterReveal).toBeGreaterThan(0);
  await page.locator("#root .block.covered").first().click({ button: "right" });
  expect(await sounds()).toBeGreaterThan(afterReveal);
});

test("game over plays the explosion wave and the lose tune before the end screen", async ({ page }) => {
  const sounds = await countSounds(page);
  await revealMines(page, 5);
  const before = await sounds();
  await revealMines(page, 6);
  await expect(endScreen(page)).toBeVisible({ timeout: 5000 });
  // boom (2 sources) + several wave pops + 3 lose notes
  expect((await sounds()) - before).toBeGreaterThan(8);
});

test("the sound button mutes everything and is remembered", async ({ page }) => {
  const sounds = await countSounds(page);
  const button = page.getByRole("button", { name: "Sound" });
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(button).toHaveText("OFF");
  await page.locator("#root .block").nth(1275).click();
  await page.locator("#root .block.covered").first().click({ button: "right" });
  expect(await sounds()).toBe(0);
  await page.reload();
  await startGame(page);
  await expect(page.getByRole("button", { name: "Sound" })).toHaveAttribute("aria-pressed", "false");
});
