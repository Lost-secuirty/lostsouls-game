import { describe, it, expect } from 'vitest';
import { stageTrackId, bossTrackId, resolveTrackFile } from '../src/core/musicMap.js';

// ADR-0024 — pure track-id helpers for the recorded-music layer (no Howler import).

describe('stageTrackId', () => {
  it('maps a floor index to stageN', () => {
    expect(stageTrackId(0)).toBe('stage0');
    expect(stageTrackId(4)).toBe('stage4');
  });
  it('clamps/normalizes bad input to stage0', () => {
    expect(stageTrackId(-3)).toBe('stage0');
    expect(stageTrackId(2.9)).toBe('stage2');
    expect(stageTrackId(undefined)).toBe('stage0');
    expect(stageTrackId(NaN)).toBe('stage0');
  });
});

describe('bossTrackId', () => {
  it('prefixes the boss key', () => {
    expect(bossTrackId('spider')).toBe('boss_spider');
    expect(bossTrackId('duo')).toBe('boss_duo');
  });
});

describe('resolveTrackFile', () => {
  const tracks = { stage0: 'outskirts.ogg', menu: null, boss_spider: '' };
  it('returns the filename when mapped to a non-empty string', () => {
    expect(resolveTrackFile(tracks, 'stage0')).toBe('outskirts.ogg');
  });
  it('returns null for null / blank / missing entries (-> synth fallback)', () => {
    expect(resolveTrackFile(tracks, 'menu')).toBe(null);
    expect(resolveTrackFile(tracks, 'boss_spider')).toBe(null);
    expect(resolveTrackFile(tracks, 'nope')).toBe(null);
  });
  it('is null-safe on bad args', () => {
    expect(resolveTrackFile(null, 'stage0')).toBe(null);
    expect(resolveTrackFile(tracks, '')).toBe(null);
  });
});
