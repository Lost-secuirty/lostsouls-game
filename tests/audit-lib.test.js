// Unit tests for the pure drift-auditor helpers (scripts/audit-lib.mjs).
// The script shell (audit-drift.mjs) does git/fs; the load-bearing logic lives here.
import { describe, it, expect } from 'vitest';
import {
  CHECK_IDS,
  checkDeviationSection,
  stripHtmlComments,
  learningsDistillDue,
  historyLine,
  hasHead,
} from '../scripts/audit-lib.mjs';

describe('checkDeviationSection', () => {
  it('flags a missing section', () => {
    expect(checkDeviationSection('## scope\n\nstuff')).toEqual({ reason: 'missing' });
  });
  it('flags an empty section', () => {
    expect(checkDeviationSection('## deviations from plan\n\n## next')).toEqual({
      reason: 'empty',
    });
  });
  it('accepts "None."', () => {
    expect(checkDeviationSection('## deviations from plan\n\nnone.\n')).toBeNull();
  });
  it('accepts real content', () => {
    expect(checkDeviationSection('## deviations from plan\n\ndeferred X to roadmap')).toBeNull();
  });
  it('strips HTML comments first (a commented heading does not count)', () => {
    expect(checkDeviationSection('<!-- ## deviations from plan\nnone -->')).toEqual({
      reason: 'missing',
    });
  });
  it('treats an empty/missing body as missing', () => {
    expect(checkDeviationSection('')).toEqual({ reason: 'missing' });
    expect(checkDeviationSection(null)).toEqual({ reason: 'missing' });
  });
  it('does not let a spliced-in comment opener smuggle a heading through', () => {
    // "<!-<!---->-> ## deviations..." collapses to "<!--> ## deviations..." after
    // ONE replace — a live "<!--" opener. The strip neutralizes it (unclosed ->
    // EOF), eating the pathological heading, so the check errs to "missing" (a nag,
    // the safe direction) rather than counting a comment-adjacent heading as real.
    expect(checkDeviationSection('<!-<!---->-> ## deviations from plan\n\n## next')).toEqual({
      reason: 'missing',
    });
  });
});

describe('stripHtmlComments', () => {
  it('removes a simple comment', () => {
    expect(stripHtmlComments('a<!-- x -->b')).toBe('ab');
  });
  it('strips to a fixed point (no leftover opener)', () => {
    expect(stripHtmlComments('<!-<!---->->')).not.toContain('<!--');
  });
  it('handles empty/nullish input', () => {
    expect(stripHtmlComments('')).toBe('');
    expect(stripHtmlComments(null)).toBe('');
    expect(stripHtmlComments(undefined)).toBe('');
  });
});

describe('learningsDistillDue', () => {
  it('returns null under the limit', () => {
    expect(learningsDistillDue('a\nb\nc', 700)).toBeNull();
  });
  it('returns the line count when over the limit', () => {
    const text = Array.from({ length: 11 }, (_, i) => `line ${i}`).join('\n');
    expect(learningsDistillDue(text, 10)).toEqual({ lines: 11 });
  });
  it('returns null for empty input', () => {
    expect(learningsDistillDue('', 700)).toBeNull();
  });
});

describe('historyLine', () => {
  it('serializes one ndjson line with reduced findings', () => {
    const line = historyLine({
      ts: '2026-06-21T00:00:00.000Z',
      base: 'aaa',
      head: 'bbb',
      pr: 42,
      findings: [{ id: 'debug-stmt', severity: 'medium', confidence: 'high', extra: 'dropped' }],
      srcNet: 12,
      autofixed: true,
    });
    expect(line.endsWith('\n')).toBe(true);
    const obj = JSON.parse(line);
    expect(obj).toMatchObject({ base: 'aaa', head: 'bbb', pr: 42, srcNet: 12, autofixed: true });
    expect(obj.findings).toEqual([{ id: 'debug-stmt', sev: 'medium', conf: 'high' }]);
  });
  it('defaults pr to null and coerces autofixed', () => {
    const obj = JSON.parse(historyLine({ ts: 't', base: 'a', head: 'b', findings: [], srcNet: 0 }));
    expect(obj.pr).toBeNull();
    expect(obj.autofixed).toBe(false);
  });
});

describe('hasHead', () => {
  const log = `${JSON.stringify({ head: 'abc' })}\n${JSON.stringify({ head: 'def' })}\n`;
  it('finds a recorded head', () => {
    expect(hasHead(log, 'def')).toBe(true);
  });
  it('returns false for an unrecorded head', () => {
    expect(hasHead(log, 'zzz')).toBe(false);
  });
  it('ignores malformed lines and empty input', () => {
    expect(hasHead('not json\n{bad\n', 'abc')).toBe(false);
    expect(hasHead('', 'abc')).toBe(false);
  });
});

describe('CHECK_IDS', () => {
  it('is a unique, non-empty id list', () => {
    expect(CHECK_IDS.length).toBeGreaterThan(0);
    expect(new Set(CHECK_IDS).size).toBe(CHECK_IDS.length);
  });
});
