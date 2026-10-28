import { describe, expect, it } from 'vitest';

import { parseInlineSegments } from '../../src/resolve/text';

describe('行内 TeX 的 parseInlineSegments', () => {
  it('当门控关闭时保留整个字符串字面量（无 lowerTex）', () => {
    const r = parseInlineSegments('$5.00 and $3.00', false);

    expect(r).toEqual({ segments: [{ text: '$5.00 and $3.00' }], hasMath: false, warn: false });
  });

  it('在 `$...$` 上分割文本和行内公式', () => {
    const r = parseInlineSegments('当 $v=d/t$ 时', true);

    expect(r.segments).toEqual([{ text: '当 ' }, { tex: 'v=d/t' }, { text: ' 时' }]);
    expect(r.hasMath).toBe(true);
    expect(r.warn).toBe(false);
  });

  it('读取 `$$...$$` 作为独立行公式段', () => {
    const r = parseInlineSegments('$$E=mc^2$$', true);

    expect(r.segments).toEqual([{ tex: 'E=mc^2', displayMode: true }]);
    expect(r.hasMath).toBe(true);
  });

  it('将多行 `$$...$$` 读取为一个独立行公式段', () => {
    const tex = String.raw`\begin{array}{rl}
f(x) &= ax^2 + bx + c\\
f'(x) &= 2ax + b
\end{array}`;
    const r = parseInlineSegments(`$$${tex}$$`, true);

    expect(r.segments).toEqual([{ tex, displayMode: true }]);
    expect(r.hasMath).toBe(true);
    expect(r.warn).toBe(false);
  });

  it('在文本片段中将转义的 `\\$` 还原为美元符号字面量', () => {
    const r = parseInlineSegments('price a\\$b only', true);

    expect(r.segments).toEqual([{ text: 'price a$b only' }]);
    expect(r.hasMath).toBe(false);
  });

  it('公式内转义的 `\\$` 不会中断数学公式', () => {
    const r = parseInlineSegments('$a \\$ b$', true);

    expect(r.segments).toEqual([{ tex: 'a \\$ b' }]);
    expect(r.hasMath).toBe(true);
  });

  it('跳过空显示公式`$$$$`', () => {
    const r = parseInlineSegments('$$$$', true);

    expect(r.segments).toEqual([{ text: '' }]);
    expect(r.hasMath).toBe(false);
  });

  it('保留不平衡的 `$` 字面量并标记警告', () => {
    const r = parseInlineSegments('a $b c', true);

    expect(r.segments).toEqual([{ text: 'a $b c' }]);
    expect(r.hasMath).toBe(false);
    expect(r.warn).toBe(true);
  });

  it('在一行上处理多个内联公式', () => {
    const r = parseInlineSegments('$a$ and $b$', true);

    expect(r.segments).toEqual([{ tex: 'a' }, { text: ' and ' }, { tex: 'b' }]);
    expect(r.hasMath).toBe(true);
  });
});
