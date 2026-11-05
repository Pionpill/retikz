import { describe, expect, it } from 'vitest';

import { layoutTextBlock } from '../../src/compile/text';
import { resolveTextLine } from '../../src/resolve/text';

const font = { size: 10 };
const resolveContext = { rootFontSize: 10, inheritedFont: font, gatingOn: false };
const context = {
  font,
  measureText: (text: string) => ({
    width: [...new Intl.Segmenter().segment(text)].length * 5,
    height: 10,
    ascent: 8,
    descent: 2,
  }),
  warn: () => {},
};

describe('共享文本块布局', () => {
  it('空的作者行仍保留行级字号占位', () => {
    const lines = [resolveTextLine({ text: '', font: { size: 40 } }, resolveContext)];
    const block = layoutTextBlock(lines, { lineHeight: 12 }, context);
    expect(block.height).toBe(40);
    expect(block.lines).toHaveLength(1);
  });
  it('按整行测量字距，不因词边界拆开输出片段', () => {
    const lines = [resolveTextLine('a b', resolveContext)];
    const block = layoutTextBlock(
      lines,
      { lineHeight: 12, maxTextWidth: 10 },
      {
        ...context,
        measureText: text => ({ width: text === 'a b' ? 9 : text.length * 4, height: 10, ascent: 8, descent: 2 }),
      },
    );
    expect(block.width).toBe(9);
    expect(block.lines).toHaveLength(1);
    expect(block.lines[0].laid.pieces).toMatchObject([{ kind: 'text', text: 'a b', width: 9 }]);
  });

  it('换行处不生成只包含分隔空格的物理行', () => {
    const lines = [resolveTextLine('ab cd', resolveContext)];
    const block = layoutTextBlock(lines, { lineHeight: 12, maxTextWidth: 10 }, context);
    expect(
      block.lines.map(line => line.laid.pieces.map(piece => (piece.kind === 'text' ? piece.text : '')).join('')),
    ).toEqual(['ab', 'cd']);
  });
  it('硬换行保留空行并使用实际基线和统一行槽', () => {
    const lines = [resolveTextLine('a\n\nb', resolveContext)];
    const block = layoutTextBlock(lines, { lineHeight: 20 }, context);
    expect(block.height).toBe(60);
    expect(block.lines.map(line => line.baselineOffset)).toEqual([13, 33, 53]);
    expect(block.lines.map(line => line.sourceLineIndex)).toEqual([0, 0, 0]);
  });

  it('长文字按字素折行并保留片段来源', () => {
    const lines = [
      resolveTextLine(
        {
          segments: [
            { text: 'ábc', fill: 'red' },
            { text: 'de', fill: 'blue' },
          ],
        },
        resolveContext,
      ),
    ];
    const block = layoutTextBlock(lines, { lineHeight: 12, maxTextWidth: 10 }, context);
    expect(block.width).toBe(10);
    expect(
      block.lines.map(line =>
        line.laid.pieces
          .filter(piece => piece.kind === 'text')
          .map(piece => piece.text)
          .join(''),
      ),
    ).toEqual(['áb', 'cd', 'e']);
    expect(block.lines[1].laid.pieces.map(piece => piece.segmentIndex)).toEqual([0, 1]);
  });

  it('不可拆公式超宽时独占一行且后续文字仍可继续布局', () => {
    const lines = [resolveTextLine({ segments: [{ text: 'a' }, { tex: 'x' }, { text: 'b' }] }, resolveContext)];
    const block = layoutTextBlock(
      lines,
      { lineHeight: 12, maxTextWidth: 10 },
      {
        ...context,
        lowerTex: () => ({ width: 30, height: 15, depth: 3, paths: [] }),
      },
    );
    expect(block.lines.map(line => line.laid.width)).toEqual([5, 30, 5]);
    expect(block.height).toBe(39);
  });
});
