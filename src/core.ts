// Game rules without the DOM, cells indexed row by row 0 .. width*height-1. VERIFIED: bun test runs them with no browser (core.test.ts, 100% lines).

export const neighbours = (index: number, width: number, height: number): number[] => {
  const x = (index % width) + 1;
  const y = Math.ceil((index + 1) / width);
  const result: number[] = [];
  if (x > 1) result.push(index - 1);
  if (x < width) result.push(index + 1);
  if (y > 1) {
    result.push(index - width);
    if (x > 1) result.push(index - 1 - width);
    if (x < width) result.push(index + 1 - width);
  }
  if (y < height) {
    result.push(index + width);
    if (x > 1) result.push(index - 1 + width);
    if (x < width) result.push(index + 1 + width);
  }
  return result;
};

export const mineCount = (width: number, height: number, ratio: number): number =>
  Math.round(width * height * ratio);

// Picks mines uniformly from every cell not in `safe` (the first click and its neighbours).
export const placeMines = (
  width: number,
  height: number,
  ratio: number,
  safe: number[],
  rand: () => number = Math.random,
): Set<number> => {
  const candidates: number[] = [];
  for (let i = 0; i < width * height; i++) {
    if (!safe.includes(i)) candidates.push(i);
  }
  const mines = new Set<number>();
  for (let i = 0; i < mineCount(width, height, ratio) && candidates.length > 0; i++) {
    const pick = Math.floor(rand() * candidates.length);
    mines.add(candidates[pick]);
    candidates.splice(pick, 1);
  }
  return mines;
};

export const countAdjacent = (index: number, mines: Set<number>, width: number, height: number): number =>
  neighbours(index, width, height).filter((n) => mines.has(n)).length;

// Clock digits [m10, m1, s10, s1]; minutes wrap after 99.
export const formatClock = (elapsedMs: number): [number, number, number, number] => {
  const seconds = Math.round(elapsedMs / 1000);
  const s = seconds % 60;
  const m = Math.floor(seconds / 60);
  return [Math.floor(m / 10) % 10, m % 10, Math.floor(s / 10), s % 10];
};

export type Heart = "full" | "half" | "empty";

// Lives are counted in halves: `halves` = 2 * hearts at the start, minus one per mine revealed.
export const heartStates = (halves: number, hearts: number): Heart[] =>
  Array.from({ length: hearts }, (_, i) => {
    const left = halves - 2 * i;
    return left >= 2 ? "full" : left === 1 ? "half" : "empty";
  });

// Clicking a revealed number reveals its other neighbours once its mines are accounted for:
// flags and already revealed mines both count.
export const mayChord = (count: number, flagged: number, revealedMines: number): boolean =>
  count !== 0 && count === flagged + revealedMines;

// Game-over wave: each cell's delay grows with its distance from `origin`; the farthest one starts at `spreadMs`.
export const explosionDelays = (origin: number, cells: number[], width: number, spreadMs: number): Map<number, number> => {
  const distance = (i: number) => Math.hypot((i % width) - (origin % width), Math.floor(i / width) - Math.floor(origin / width));
  const farthest = Math.max(0, ...cells.map(distance));
  return new Map(cells.map(i => [i, farthest === 0 ? 0 : Math.round((distance(i) / farthest) * spreadMs)]));
};

// One wave sound per `stepMs` slot instead of one per mine: delays rounded to the step, deduplicated, sorted.
export const waveTimes = (delays: number[], stepMs: number): number[] =>
  [...new Set(delays.map(d => Math.round(d / stepMs) * stepMs))].sort((a, b) => a - b);

export type Level = { name: string; width: number; height: number; mines: number; hearts: number };

// the classic three sizes plus the original 50x50 board; harder levels forgive more mines
export const LEVELS: Level[] = [
  { name: "Easy", width: 9, height: 9, mines: 10, hearts: 1 },
  { name: "Medium", width: 16, height: 16, mines: 40, hearts: 2 },
  { name: "Hard", width: 30, height: 16, mines: 99, hearts: 3 },
  { name: "Huge", width: 50, height: 50, mines: 375, hearts: 3 },
];

// FieldMatrix takes a mine ratio; this one gives back exactly level.mines through mineCount
export const mineRatio = (level: Level): number => level.mines / (level.width * level.height);
