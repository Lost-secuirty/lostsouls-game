// =====================================================================
// startmenu.js — the title screen. Shows "1 Player" / "2 Players" and calls
// back with the chosen co-op flag, then hides itself. Plain DOM overlay
// (#startmenu in index.html) — no library.
// =====================================================================

export function showStartMenu(onChoose) {
  const menu = document.getElementById('startmenu');
  if (!menu) {
    onChoose(false);
    return;
  }
  menu.classList.add('show');

  const pick = (coop) => {
    menu.classList.remove('show');
    onChoose(coop);
  };
  const b1 = document.getElementById('btn1p');
  const b2 = document.getElementById('btn2p');
  if (b1) b1.onclick = () => pick(false);
  if (b2) b2.onclick = () => pick(true);
}
