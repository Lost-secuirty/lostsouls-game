// =====================================================================
// states.js — the handful of "modes" the game can be in.
// =====================================================================

export const State = {
  BOOT: 'BOOT', // before the first frame
  PLAYING: 'PLAYING', // fighting monsters
  ROOM_CLEAR: 'ROOM_CLEAR', // room cleared, walk to the glowing door
  HUMAN_CHOICE: 'HUMAN_CHOICE', // the human decision-boss: picking A/B/C/D (fight paused)
  DEAD: 'DEAD', // you died — press R
  WIN: 'WIN', // you escaped the city — press R
};
