// =====================================================================
// states.js — the handful of "modes" the game can be in.
// =====================================================================

export const State = {
  BOOT: 'BOOT', // before the first frame
  PLAYING: 'PLAYING', // fighting monsters
  ROOM_CLEAR: 'ROOM_CLEAR', // room cleared, walk to the glowing door
  DEAD: 'DEAD', // you died — press R
  WIN: 'WIN', // you escaped the city — press R
};
