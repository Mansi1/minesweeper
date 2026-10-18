// Win confetti: pieces in a fixed, click-through overlay. Each piece gets its own CSS variables and the
// `confetti` keyframes in style.css do the falling, so the browser schedules every piece itself (like the mine waves).
// VERIFIED: e2e sees all 120 pieces on a win and the overlay removed afterwards.
const COLORS = ['#ff0000', '#ffcc00', '#00c800', '#0000ff', '#ff00ff', '#00c8c8'];
const MAX_DELAY_MS = 800;
const MIN_FALL_MS = 2500;
const MAX_FALL_MS = 4200;

export const launchConfetti = (count = 120) => {
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('i');
    piece.style.setProperty('--x', `${Math.random() * 100}vw`);
    piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 30}vw`);
    piece.style.setProperty('--spin', `${360 + Math.random() * 720}deg`);
    piece.style.setProperty('--delay', `${Math.random() * MAX_DELAY_MS}ms`);
    piece.style.setProperty('--fall', `${MIN_FALL_MS + Math.random() * (MAX_FALL_MS - MIN_FALL_MS)}ms`);
    piece.style.background = COLORS[i % COLORS.length];
    layer.append(piece);
  }
  document.body.append(layer);
  // gone once the last piece has landed
  setTimeout(() => layer.remove(), MAX_DELAY_MS + MAX_FALL_MS);
};
