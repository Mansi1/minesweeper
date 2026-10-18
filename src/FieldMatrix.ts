import { Block, blockOf, MINE_REVEALED } from "./Block";
import { countAdjacent, explosionDelays, formatClock, heartStates, mineCount, placeMines, waveTimes } from "./core";
import { launchConfetti } from "./confetti";
import { requireEl } from "./dom";
import { LOSE_TUNE_MS, play, WIN_TUNE_MS } from "./sound";

// game-over wave: last mine starts after SPREAD_MS and pops for BOOM_MS (matches .boom in style.css)
const SPREAD_MS = 1500;
const BOOM_MS = 450;
// win wave: every cell bounces for CHEER_MS (matches .cheer in style.css), the last one starting after CHEER_SPREAD_MS;
// the win screen waits for the wave and lets the confetti fall a while longer
const CHEER_SPREAD_MS = 1200;
const CHEER_MS = 600;
const CELEBRATE_MS = CHEER_SPREAD_MS + CHEER_MS + 800;

// Fired (bubbling, on #root) once the game is won or lost and its end animation is over.
export const GAME_END = 'game-end';
export type GameEnd = { won: boolean; ms: number };

export class FieldMatrix {
  readonly rootElement = requireEl('root');
  readonly rootFrameElement = requireEl('root-frame');
  readonly livesElement = requireEl('lives');
  readonly field: Block[];
  mines = new Set<number>();
  time = 0;
  timer = 0;
  over = false;
  // lives in half hearts: every revealed mine costs one
  halves: number;

  constructor(readonly width: number, readonly height: number, readonly mineAmount = 0.1, readonly hearts = 3) {
    this.halves = 2 * hearts;
    this.field = this.renderField()
    this.rootElement.addEventListener(MINE_REVEALED, this.onMine)
    // registered after renderField's first-click handler, so it sees the board after every click.
    // VERIFIED: e2e wins Easy with the very first click
    this.rootElement.addEventListener('click', this.checkWin)
    // block flag handlers run on the cell first, then this recounts on the root
    this.rootElement.addEventListener('mousedown', this.renderMarkers)
    this.renderLives()
    this.renderStatus()
  }

  renderLives = () => {
    this.livesElement.replaceChildren(...heartStates(this.halves, this.hearts).map(state => {
      const heart = document.createElement('span')
      heart.classList.add('heart', state)
      return heart
    }))
    this.livesElement.setAttribute('aria-label', `${this.halves / 2} of ${this.hearts} lives`)
  }

  renderMarkers = () => {
    requireEl('markers').innerText = ' ' + this.field.filter(b => b.isMarked).length;
  }

  renderStatus = () => {
    requireEl('mines').innerText = ' ' + mineCount(this.width, this.height, this.mineAmount);
    requireEl('fields').innerText = ' ' + this.height * this.width;
    this.renderMarkers();
    ['minutes10', 'minutes1', 'seconds10', 'seconds1'].forEach(id => requireEl(id).innerText = '0');
  }

  onMine = (evt: Event) => {
    if (this.over) return;
    this.halves--;
    this.renderLives()
    const hit = blockOf(evt.target);
    if (this.halves === 0 && hit) this.gameOver(hit)
    else play('hit')
  }

  // abandons the game (restart, new game): no more clock ticks or lives lost
  stop = () => {
    this.over = true;
    clearInterval(this.timer)
  }

  // stops the clock and locks the board; `afterMs` later the end screen gets its GAME_END
  finish = (won: boolean, afterMs: number) => {
    this.stop()
    this.rootElement.classList.add('game-over')
    const detail: GameEnd = { won, ms: Date.now() - this.time };
    setTimeout(() => this.rootElement.dispatchEvent(new CustomEvent(GAME_END, { bubbles: true, detail })), afterMs)
  }

  gameOver = (hit: Block) => {
    this.rootFrameElement.classList.add('shake')
    hit.el.classList.add('hit')
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hidden = [...this.mines].filter(i => !this.field[i].isRevealed);
    const delays = explosionDelays(hit.index, hidden, this.width, still ? 0 : SPREAD_MS);
    delays.forEach((delay, i) => this.field[i].explode(delay))
    play('boom')
    waveTimes([...delays.values()], 100).forEach(ms => play('pop', ms))
    const waveEnd = still ? 0 : SPREAD_MS + BOOM_MS;
    play('lose', waveEnd)
    this.finish(false, waveEnd + LOSE_TUNE_MS)
  }

  // won once every safe cell is revealed; revealed mines (lost lives) don't block it
  checkWin = (evt: MouseEvent) => {
    if (this.over || this.mines.size === 0 || !this.field.every(b => b.isMine || b.isRevealed)) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const origin = blockOf(evt.target)?.index ?? 0;
    const delays = explosionDelays(origin, this.field.map(b => b.index), this.width, still ? 0 : CHEER_SPREAD_MS);
    delays.forEach((delay, i) => this.field[i].cheer(delay))
    this.renderMarkers()
    play('win')
    if (!still) {
      this.rootFrameElement.classList.add('won')
      waveTimes([...delays.values()], 100).forEach(ms => play('sparkle', ms))
      launchConfetti()
    }
    this.finish(true, still ? WIN_TUNE_MS : Math.max(WIN_TUNE_MS, CELEBRATE_MS))
  }

  renderField = (): Block[] => {
    //set width and height to root element
    const style = `height: ${this.height * 20}px; width: ${this.width * 20}px;`;
    this.rootElement.setAttribute('style', style)
    this.rootFrameElement.setAttribute('style', style)
    this.rootElement.addEventListener('click', this.onClick)
    const field: Block[] = []
    for (let index = 0, y = 1; y <= this.height; y++) {
      const row = document.createElement('div')
      row.classList.add('row')
      for (let x = 1; x <= this.width; x++, index++) {
        const block = new Block(index, this.width, this.height, field);
        field.push(block);
        row.appendChild(block.render())
      }
      this.rootElement.appendChild(row)
    }
    return field;
  }

  onClick = (evt: MouseEvent) => {
    const block = blockOf(evt.target);
    // a click on the frame between cells starts nothing
    if (!block) return;
    this.mines = placeMines(this.width, this.height, this.mineAmount, [block.index, ...block.neighbours]);
    this.startStatus();
    this.field.forEach(block => {
      block.setIsMineAndCount(this.mines.has(block.index),
        countAdjacent(block.index, this.mines, this.width, this.height)
      )
    })
    this.rootElement.removeEventListener('click', this.onClick);
    block.onClick();
  }

  startStatus = () => {
    this.time = Date.now();
    const digits = ['minutes10', 'minutes1', 'seconds10', 'seconds1'].map(requireEl);
    const calculateDate = () => {
      formatClock(Date.now() - this.time).forEach((d, i) => digits[i].innerText = `${d}`);
    }
    this.timer = window.setInterval(calculateDate, 1000)
  }
}
