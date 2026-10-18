import { formatClock, LEVELS, mineRatio, type Level } from "./core";
import { requireEl } from "./dom";
import { FieldMatrix, GAME_END, type GameEnd } from "./FieldMatrix";
import { bindSoundButton } from "./sound";

// main owns the start and end screens (native <dialog>, so no alert blocks the page); FieldMatrix only reports GAME_END
const startScreen = requireEl("start") as HTMLDialogElement;
const endScreen = requireEl("end") as HTMLDialogElement;
let level = LEVELS[0];
let game: FieldMatrix | undefined;

const newGame = (next: Level) => {
  level = next;
  game?.stop();
  // a fresh #root drops the finished game's listeners and classes; a teardown method could miss one.
  // VERIFIED: e2e "play again" plays a fresh board after a finished one
  const root = document.createElement("div");
  root.id = "root";
  requireEl("root").replaceWith(root);
  requireEl("root-frame").classList.remove("shake", "won");
  game = new FieldMatrix(level.width, level.height, mineRatio(level), level.hearts);
  startScreen.close();
  endScreen.close();
};

requireEl("levels").replaceChildren(...LEVELS.map(l => {
  const button = document.createElement("button");
  button.type = "button";
  const size = document.createElement("small");
  size.textContent = `${l.width} × ${l.height} · ${l.mines} mines · ${l.hearts} ${l.hearts === 1 ? "heart" : "hearts"}`;
  button.append(l.name, size);
  button.addEventListener("click", () => newGame(l));
  return button;
}));

document.addEventListener(GAME_END, evt => {
  const { won, ms } = (evt as CustomEvent<GameEnd>).detail;
  const [m10, m1, s10, s1] = formatClock(ms);
  endScreen.classList.toggle("won", won);
  requireEl("end-title").innerText = won ? "You win!" : "Game over";
  requireEl("end-detail").innerText = `${level.name} · ${m10}${m1}:${s10}${s1}`;
  endScreen.showModal();
});

const showMenu = () => {
  game?.stop();
  endScreen.close();
  startScreen.showModal();
};

requireEl("again").addEventListener("click", () => newGame(level));
requireEl("menu").addEventListener("click", showMenu);
// the same two choices during a game, from the status panel
requireEl("restart").addEventListener("click", () => newGame(level));
requireEl("new-game").addEventListener("click", showMenu);
// Escape would leave a screen with no way back into a game
for (const screen of [startScreen, endScreen]) screen.addEventListener("cancel", evt => evt.preventDefault());

bindSoundButton(requireEl("sound"));
startScreen.showModal();
