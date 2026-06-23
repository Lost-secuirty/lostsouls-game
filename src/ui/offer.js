// =====================================================================
// offer.js — the room-clear "pick 1 of 3" upgrade OFFER overlay (B9b). Shows N tier-colored cards
// (from core/offers.js); the player picks one. Plain DOM overlay (#offer in index.html) — no library,
// same shape as humanchoice.js. Mouse, keyboard (1-3 / arrows + Enter), and gamepad (via
// moveOfferFocus/confirmOffer, driven from game.update's OFFER arm). Solo also gets an [R] control to
// reroll the AI ally's weapon. If the overlay element is missing (headless tests / browser smoke), it
// auto-resolves the first card so the game still advances. Never throws.
// =====================================================================

const TIER_LABEL = { common: 'COMMON', rare: 'RARE', epic: 'EPIC', ultra: 'ULTRA' };

let active = null; // { moveFocus, confirm } while the overlay is up (for the gamepad path)

/**
 * Show the offer overlay.
 * @param {Array<{id:string,name:string,category:string,tier:string,blurb:string}>} cards
 * @param {{onPick:(i:number)=>void, solo?:boolean, playerTag?:string|null,
 *          allyWeaponName?:string|null, onReroll?:(()=>string)|null}} opts
 *   onPick = required, called with the chosen index then the overlay hides; solo = show the ally-reroll
 *   control; playerTag = 'P1'/'P2' in co-op (null solo); onReroll = called on [R], returns the NEW ally
 *   weapon name (the hint updates in place; the overlay stays open).
 */
export function showOffer(
  cards,
  { onPick, solo = false, playerTag = null, allyWeaponName = null, onReroll = null } = {},
) {
  const overlay = typeof document !== 'undefined' && document.getElementById('offer');
  if (!overlay) {
    onPick(0); // headless / no-DOM: resolve so the game still advances
    return;
  }

  const title = document.getElementById('offer-title');
  if (title)
    title.textContent = playerTag ? `${playerTag} — CHOOSE AN UPGRADE` : 'CHOOSE AN UPGRADE';

  // build the cards fresh each time
  const wrap = document.getElementById('offer-cards');
  wrap.textContent = '';
  const buttons = cards.map((c, i) => {
    const btn = document.createElement('button');
    btn.className = `offer-card tier-${c.tier}`;
    const mk = (cls, text) => {
      const el = document.createElement('div');
      el.className = cls;
      el.textContent = text;
      return el;
    };
    btn.append(
      mk('offer-key', String(i + 1)),
      mk('offer-tier', TIER_LABEL[c.tier] ?? String(c.tier).toUpperCase()),
      mk('offer-name', c.name),
      mk('offer-blurb', c.blurb),
    );
    wrap.append(btn);
    return btn;
  });

  // ally-weapon reroll control (solo only)
  const rerollEl = document.getElementById('offer-reroll');
  const renderReroll = (name) => {
    if (rerollEl) rerollEl.textContent = `[R] Reroll ally's weapon  (now: ${name})`;
  };
  const doReroll = () => {
    if (!onReroll) return;
    renderReroll(onReroll() ?? allyWeaponName ?? '—');
  };
  if (rerollEl) {
    const showReroll = !!(solo && onReroll);
    rerollEl.style.display = showReroll ? '' : 'none';
    rerollEl.onclick = showReroll ? doReroll : null;
    if (showReroll) renderReroll(allyWeaponName ?? '—');
  }

  const controls = document.getElementById('offer-controls');
  if (controls) controls.textContent = '1-3 / click / arrows + Enter  ·  left-stick + A';

  overlay.classList.add('show');

  let focus = 0;
  const setFocus = (i) => {
    focus = (i + buttons.length) % buttons.length;
    buttons.forEach((b, j) => b.classList.toggle('focus', j === focus));
  };
  setFocus(0);

  const pick = (i) => {
    cleanup();
    onPick(i);
  };

  const onKey = (e) => {
    const k = e.key;
    if (k >= '1' && k <= String(buttons.length)) {
      pick(Number(k) - 1);
      e.preventDefault();
    } else if (k === 'ArrowRight' || k === 'ArrowDown') {
      setFocus(focus + 1);
      e.preventDefault();
    } else if (k === 'ArrowLeft' || k === 'ArrowUp') {
      setFocus(focus - 1);
      e.preventDefault();
    } else if (k === 'Enter' || k === ' ') {
      pick(focus);
      e.preventDefault();
    } else if ((k === 'r' || k === 'R') && solo && onReroll) {
      doReroll();
      e.preventDefault();
    }
  };

  buttons.forEach((btn, i) => (btn.onclick = () => pick(i)));
  addEventListener('keydown', onKey, true);

  active = {
    moveFocus: (dir) => setFocus(focus + (dir > 0 ? 1 : -1)),
    confirm: () => pick(focus),
  };

  function cleanup() {
    overlay.classList.remove('show');
    removeEventListener('keydown', onKey, true);
    buttons.forEach((b) => (b.onclick = null));
    if (rerollEl) rerollEl.onclick = null;
    active = null;
  }
}

/** gamepad focus nudge (driven from game.update's OFFER arm); no-op if closed */
export function moveOfferFocus(dir) {
  active?.moveFocus(dir);
}

/** gamepad confirm (driven from game.update's OFFER arm); no-op if closed */
export function confirmOffer() {
  active?.confirm();
}
