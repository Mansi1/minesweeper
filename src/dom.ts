// VERIFIED: strict tsc types getElementById as nullable (TS2531); index.html must provide these ids, so fail loudly at startup.
export const requireEl = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id} in index.html`);
  return el;
};
