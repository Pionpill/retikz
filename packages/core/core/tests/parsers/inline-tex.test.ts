import { describe, expect, it } from 'vitest';
import { parseInlineRuns } from '../../src/parsers/inline-tex';

describe('[inline-tex] parseInlineRuns', () => {
  it('keeps the whole string literal when gating is off (no lowerTex)', () => {
    const r = parseInlineRuns('$5.00 and $3.00', false);
    expect(r).toEqual({ runs: [{ text: '$5.00 and $3.00' }], hasMath: false, warn: false });
  });

  it('splits text and inline math on `$...$`', () => {
    const r = parseInlineRuns('当 $v=d/t$ 时', true);
    expect(r.runs).toEqual([{ text: '当 ' }, { tex: 'v=d/t' }, { text: ' 时' }]);
    expect(r.hasMath).toBe(true);
    expect(r.warn).toBe(false);
  });

  it('reads `$$...$$` as a display math run', () => {
    const r = parseInlineRuns('$$E=mc^2$$', true);
    expect(r.runs).toEqual([{ tex: 'E=mc^2', displayMode: true }]);
    expect(r.hasMath).toBe(true);
  });

  it('unescapes `\\$` to a literal dollar in text runs', () => {
    const r = parseInlineRuns('price a\\$b only', true);
    expect(r.runs).toEqual([{ text: 'price a$b only' }]);
    expect(r.hasMath).toBe(false);
  });

  it('does not break math on an escaped `\\$` inside the formula', () => {
    const r = parseInlineRuns('$a \\$ b$', true);
    expect(r.runs).toEqual([{ tex: 'a \\$ b' }]);
    expect(r.hasMath).toBe(true);
  });

  it('skips an empty display formula `$$$$`', () => {
    const r = parseInlineRuns('$$$$', true);
    expect(r.runs).toEqual([{ text: '' }]);
    expect(r.hasMath).toBe(false);
  });

  it('keeps an unbalanced `$` literal and flags a warning', () => {
    const r = parseInlineRuns('a $b c', true);
    expect(r.runs).toEqual([{ text: 'a $b c' }]);
    expect(r.hasMath).toBe(false);
    expect(r.warn).toBe(true);
  });

  it('handles multiple inline formulas on one line', () => {
    const r = parseInlineRuns('$a$ and $b$', true);
    expect(r.runs).toEqual([{ tex: 'a' }, { text: ' and ' }, { tex: 'b' }]);
    expect(r.hasMath).toBe(true);
  });
});
