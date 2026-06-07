// =====================================================================
// prompts.js — the little "[E] Help   [Q] Leave" prompt that pops up when
// you're standing next to a survivor.
// =====================================================================

const prompt = () => document.getElementById('prompt');

export const prompts = {
  show(text) {
    const el = prompt();
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
  },
  hide() {
    prompt()?.classList.remove('show');
  },
};
