// =====================================================================
// metaProgress.js — the "Resonance" meta-progression panel (B10 / ADR-0029).
// Opens as a native <dialog> from the start menu (🌀 Resonance button) or
// from the win/game-over screen (F key / Select).
//
// Pre-beat: shows a locked banner (no Echoes yet, gate message).
// Post-beat: shows the Echoes balance + every META_UPGRADES node with a Buy
// button. Buy → saves.buy(id) → re-render, so the balance stays live.
//
// Mirrors ui/credits.js: showModal/close, backdrop-click-to-close, XSS-safe.
// Never throws when DOM is absent (headless / unit tests).
// =====================================================================

import { META_UPGRADES } from '../config.js';
import { saves, costOf } from '../core/saves.js';

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );

function render(content) {
  if (!content) return;
  const save = saves.get();

  if (!save.gameBeaten) {
    content.innerHTML =
      '<p class="meta-echoes">✨ 0 Echoes</p>' +
      '<div class="meta-locked">🔒 Beat the city to absorb its Echoes.<br>' +
      'Permanent upgrades unlock after your first full victory.</div>';
    return;
  }

  const nodeCards = META_UPGRADES.map((node) => {
    const level = save.upgrades[node.id] ?? 0;
    const maxed = level >= node.maxLevel;
    const cost = maxed ? null : costOf(node.id, level);
    const canBuy = !maxed && save.echoes >= cost;
    const levelStr = `${level} / ${node.maxLevel}`;
    const btnLabel = maxed ? 'Maxed' : `Buy (${cost} ✨)`;
    const nodeClass = maxed ? 'meta-node maxed' : 'meta-node';
    return (
      `<div class="${nodeClass}">` +
      `<div class="meta-node-header">${esc(node.icon)} ${esc(node.name)}</div>` +
      `<div class="meta-node-desc">${esc(node.desc)}</div>` +
      `<div class="meta-node-level">Level ${esc(levelStr)}</div>` +
      `<button class="meta-node-buy" data-id="${esc(node.id)}" ${maxed || !canBuy ? 'disabled' : ''}>${esc(btnLabel)}</button>` +
      '</div>'
    );
  }).join('');

  content.innerHTML =
    `<p class="meta-echoes">✨ ${save.echoes} Echoes</p>` +
    `<div class="meta-nodes">${nodeCards}</div>`;

  // wire buy buttons
  for (const btn of content.querySelectorAll('.meta-node-buy[data-id]:not([disabled])')) {
    btn.addEventListener('click', () => {
      saves.buy(btn.dataset.id);
      render(content);
    });
  }
}

function _show(panel) {
  render(document.getElementById('meta-content'));
  if (panel.showModal) panel.showModal();
  else panel.setAttribute('open', '');
}

export function initMetaPanel() {
  const panel = document.getElementById('meta');
  const openBtn = document.getElementById('btn-meta');
  const closeBtn = document.getElementById('meta-close');
  if (!panel) return;

  const close = () => (panel.close ? panel.close() : panel.removeAttribute('open'));
  openBtn?.addEventListener('click', () => _show(panel));
  closeBtn?.addEventListener('click', close);
  panel.addEventListener('click', (e) => {
    if (e.target === panel) close();
  });
}

export function openMetaPanel() {
  const panel = document.getElementById('meta');
  if (panel) _show(panel);
}
