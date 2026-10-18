import { describe, expect, test } from "bun:test";
import { countAdjacent, explosionDelays, formatClock, heartStates, LEVELS, mayChord, mineCount, mineRatio, neighbours, placeMines, waveTimes } from "./core";

const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

describe("neighbours", () => {
  test("corner, edge and interior cells of a 4x3 grid", () => {
    expect(sorted(neighbours(0, 4, 3))).toEqual([1, 4, 5]);
    expect(sorted(neighbours(11, 4, 3))).toEqual([6, 7, 10]);
    expect(sorted(neighbours(1, 4, 3))).toEqual([0, 2, 4, 5, 6]);
    expect(sorted(neighbours(5, 4, 3))).toEqual([0, 1, 2, 4, 6, 8, 9, 10]);
  });

  test("never wraps across row ends", () => {
    expect(sorted(neighbours(3, 4, 3))).toEqual([2, 6, 7]);
    expect(sorted(neighbours(4, 4, 3))).toEqual([0, 1, 5, 8, 9]);
  });
});

describe("placeMines", () => {
  test("places round(w*h*ratio) mines, none on the safe cells", () => {
    const safe = [0, ...neighbours(0, 50, 50)];
    const mines = placeMines(50, 50, 0.15, safe);
    expect(mines.size).toBe(375);
    for (const s of safe) expect(mines.has(s)).toBe(false);
    for (const m of mines) expect(m >= 0 && m < 2500).toBe(true);
  });

  test("same random source gives the same mines", () => {
    const seeded = () => {
      let s = 42;
      return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    };
    expect([...placeMines(10, 10, 0.2, [], seeded())]).toEqual([...placeMines(10, 10, 0.2, [], seeded())]);
  });
});

describe("countAdjacent", () => {
  test("counts mines among the neighbours only", () => {
    const mines = new Set([0, 1, 5, 11]);
    expect(countAdjacent(5, mines, 4, 3)).toBe(2);
    expect(countAdjacent(10, mines, 4, 3)).toBe(2);
    expect(countAdjacent(3, mines, 4, 3)).toBe(0);
  });
});

describe("formatClock", () => {
  test("splits elapsed time into mm:ss digits", () => {
    expect(formatClock(0)).toEqual([0, 0, 0, 0]);
    expect(formatClock(754_000)).toEqual([1, 2, 3, 4]);
    expect(formatClock(3_599_000)).toEqual([5, 9, 5, 9]);
  });

  test("rounds to the nearest second and wraps after 99:59", () => {
    expect(formatClock(1_499)).toEqual([0, 0, 0, 1]);
    expect(formatClock(1_500)).toEqual([0, 0, 0, 2]);
    expect(formatClock(6_000_000)).toEqual([0, 0, 0, 0]);
  });
});

describe("heartStates", () => {
  test("fills hearts from the left, half a heart per remaining half", () => {
    expect(heartStates(6, 3)).toEqual(["full", "full", "full"]);
    expect(heartStates(5, 3)).toEqual(["full", "full", "half"]);
    expect(heartStates(2, 3)).toEqual(["full", "empty", "empty"]);
    expect(heartStates(1, 3)).toEqual(["half", "empty", "empty"]);
    expect(heartStates(0, 3)).toEqual(["empty", "empty", "empty"]);
  });
});

describe("mayChord", () => {
  test("revealed mines count like flags towards the number", () => {
    expect(mayChord(2, 2, 0)).toBe(true);
    expect(mayChord(2, 0, 2)).toBe(true);
    expect(mayChord(2, 1, 1)).toBe(true);
    expect(mayChord(2, 1, 0)).toBe(false);
    expect(mayChord(2, 2, 1)).toBe(false);
  });

  test("a zero cell never chords", () => {
    expect(mayChord(0, 0, 0)).toBe(false);
  });
});

describe("explosionDelays", () => {
  test("spreads outward from the hit mine, farthest mine at spreadMs", () => {
    // 10 wide: origin 0 = (0,0); 2 = (2,0); 22 = (2,2); 99 = (9,9)
    const delays = explosionDelays(0, [99, 2, 22], 10, 1000);
    expect(delays.get(99)).toBe(1000);
    expect(delays.get(2)!).toBeLessThan(delays.get(22)!);
    expect(delays.get(22)!).toBeLessThan(delays.get(99)!);
    expect(delays.get(2)).toBe(Math.round((2 / Math.hypot(9, 9)) * 1000));
  });

  test("no spread means everything at once", () => {
    expect([...explosionDelays(5, [1, 50, 99], 10, 0).values()]).toEqual([0, 0, 0]);
    expect(explosionDelays(5, [], 10, 1000).size).toBe(0);
  });
});

describe("waveTimes", () => {
  test("bundles mine delays into one sound per step", () => {
    expect(waveTimes([0, 30, 260, 240, 1500, 1460], 100)).toEqual([0, 200, 300, 1500]);
    expect(waveTimes([], 100)).toEqual([]);
  });
});

describe("LEVELS", () => {
  test("each level's ratio places exactly its mine count", () => {
    for (const level of LEVELS) expect(mineCount(level.width, level.height, mineRatio(level))).toBe(level.mines);
  });

  test("easier levels never give more hearts than harder ones", () => {
    const hearts = LEVELS.map(l => l.hearts);
    expect(hearts).toEqual([...hearts].sort((a, b) => a - b));
    expect(hearts[0]).toBeLessThan(hearts[2]);
  });
});
