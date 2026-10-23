import { describe, expect, it } from 'vitest';

import { parseInlineSegments } from '../../src/resolve/text';

describe('[inline-tex] parseInlineSegments', () => {
  it('keeps the whole string literal when gating is off (no lowerTex)', () => {
    const r = parseInlineSegments('$5.00 and $3.00', false);

    expect(r).toEqual({ segments: [{ text: '$5.00 and $3.00' }], hasMath: false, warn: false });
  });

  it('splits text and inline math on `$...$`', () => {
    const r = parseInlineSegments('当 $v=d/t$ 时', true);

    expect(r.segments).toEqual([{ text: '当 ' }, { tex: 'v=d/t' }, { text: ' 时' }]);
    expect(r.hasMath).toBe(true);
    expect(r.warn).toBe(false);
  });

  it('reads `$$...$$` as a display math segment', () => {
    const r = parseInlineSegments('$$E=mc^2$$', true);

    expect(r.segments).toEqual([{ tex: 'E=mc^2', displayMode: true }]);
    expect(r.hasMath).toBe(true);
  });

  it('reads multiline `$$...$$` as one display math segment', () => {
    const tex = String.raw`\begin{array}{rl}
f(x) &= ax^2 + bx + c\\
f'(x) &= 2ax + b
\end{array}`;
    const r = parseInlineSegments(`$$${tex}$$`, true);

    expect(r.segments).toEqual([{ tex, displayMode: true }]);
    expect(r.hasMath).toBe(true);
    expect(r.warn).toBe(false);
  });

  it('unescapes `\\$` to a literal dollar in text segments', () => {
    const r = parseInlineSegments('price a\\$b only', true);

    expect(r.segments).toEqual([{ text: 'price a$b only' }]);
    expect(r.hasMath).toBe(false);
  });

  it('does not break math on an escaped `\\$` inside the formula', () => {
    const r = parseInlineSegments('$a \\$ b$', true);

    expect(r.segments).toEqual([{ tex: 'a \\$ b' }]);
    expect(r.hasMath).toBe(true);
  });

  it('skips an empty display formula `$$$$`', () => {
    const r = parseInlineSegments('$$$$', true);

    expect(r.segments).toEqual([{ text: '' }]);
    expect(r.hasMath).toBe(false);
  });

  it('keeps an unbalanced `$` literal and flags a warning', () => {
    const r = parseInlineSegments('a $b c', true);

    expect(r.segments).toEqual([{ text: 'a $b c' }]);
    expect(r.hasMath).toBe(false);
    expect(r.warn).toBe(true);
  });

  it('handles multiple inline formulas on one line', () => {
    const r = parseInlineSegments('$a$ and $b$', true);

    expect(r.segments).toEqual([{ tex: 'a' }, { text: ' and ' }, { tex: 'b' }]);
    expect(r.hasMath).toBe(true);
  });
});
