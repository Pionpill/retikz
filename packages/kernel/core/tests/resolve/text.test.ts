import { describe, expect, it, vi } from 'vitest';

import { BuiltinCompileWarningCode } from '../../src/compile/shared';
import { resolveFont, resolveTextBlock } from '../../src/resolve/text';
import { resolveFontSize, resolveTextLineHeight } from '../../src/resolve/text/font';

/** 经文本块解析消费单个作者行 */
const resolveTestLine = (
  source: Parameters<typeof resolveTextBlock>[0]['text'][number],
  context: Parameters<typeof resolveTextBlock>[1],
) => resolveTextBlock({ text: [source] }, context).lines[0];

describe('解析文本', () => {
  it.each([
    { scale: { x: 1, y: 1 }, fontSize: 20, formulaSize: 10, lineHeight: 30, maxTextWidth: 80 },
    { scale: { x: 2, y: 3 }, fontSize: 40, formulaSize: 20, lineHeight: 90, maxTextWidth: 160 },
  ])('混排文本块应用缩放并隔离作者字体，scale=$scale', expected => {
    const source = {
      text: [
        {
          font: { size: '0.5em' as const },
          segments: [{ text: 'a', font: { size: '2em' as const } }, { tex: 'x' }],
        },
      ],
      lineHeight: 30,
      maxTextWidth: 80,
    };
    const before = structuredClone(source);
    const result = resolveTextBlock(source, {
      rootFontSize: 16,
      inheritedFont: { size: 20, family: 'serif' },
      gatingOn: true,
      scale: expected.scale,
    });
    expect(result).toMatchObject({
      font: { size: expected.fontSize },
      lineHeight: expected.lineHeight,
      maxTextWidth: expected.maxTextWidth,
      lines: [
        {
          plainText: 'a',
          hasMath: true,
          style: { font: { size: expected.formulaSize } },
          segments: [
            { text: 'a', font: { size: expected.fontSize } },
            { tex: 'x', fontSize: expected.formulaSize },
          ],
        },
      ],
    });
    const segment = result.lines[0].segments[0];
    if ('text' in segment) segment.font.size = 999;
    expect(source).toEqual(before);
  });

  it('解析字体预设和相对单位', () => {
    expect(resolveFontSize('sm', { rootFontSize: 20, inheritedFontSize: 12 })).toBe(17.5);
    expect(resolveFontSize('1.25rem', { rootFontSize: 20, inheritedFontSize: 12 })).toBe(25);
    expect(resolveFontSize('0.5em', { rootFontSize: 20, inheritedFontSize: 12 })).toBe(6);
  });

  it('独立继承缺失的字体字段', () => {
    expect(
      resolveFont(
        { size: '0.5em', weight: 'bold' },
        {
          rootFontSize: 16,
          inheritedFont: { size: 20, family: 'Inter', weight: 400, style: 'italic' },
        },
      ),
    ).toEqual({ size: 10, family: 'Inter', weight: 700, style: 'italic' });
  });

  it('字重关键字转为数值，缺省继承且数值不取整', () => {
    const context = { rootFontSize: 16, inheritedFont: { size: 16, weight: 700 } };
    expect(resolveFont({ weight: 'normal' }, context).weight).toBe(400);
    expect(resolveFont({ weight: 'bold' }, context).weight).toBe(700);
    expect(resolveFont({ weight: 462.5 }, context).weight).toBe(462.5);
    expect(resolveFont(undefined, context).weight).toBe(700);
    expect(resolveFont(undefined, { rootFontSize: 16, inheritedFont: { size: 16 } }).weight).toBeUndefined();
  });

  it('解析字符串简写和 TeX 门控', () => {
    const inheritedFont = { size: 16, family: 'serif' } as const;

    expect(
      resolveTestLine('a $x$ b', {
        rootFontSize: 16,
        inheritedFont,
        gatingOn: false,
      }),
    ).toMatchObject({
      segments: [{ text: 'a $x$ b', font: inheritedFont }],
      plainText: 'a $x$ b',
      hasMath: false,
      mixed: false,
    });
    expect(
      resolveTestLine('a $x$ b', {
        rootFontSize: 16,
        inheritedFont,
        gatingOn: true,
      }),
    ).toMatchObject({
      segments: [{ text: 'a ', font: inheritedFont }, { tex: 'x' }, { text: ' b', font: inheritedFont }],
      plainText: 'a  b',
      hasMath: true,
      mixed: true,
    });
  });

  it('折叠样式线绘制并解析其字体而不发出继承的样式', () => {
    const resolved = resolveTestLine(
      { text: 'styled', fill: 'red', opacity: 0.5, font: { size: '0.5em', weight: 'bold' } },
      {
        rootFontSize: 16,
        inheritedFont: { size: 20, family: 'Inter', style: 'italic' },
        gatingOn: true,
      },
    );

    expect(resolved.segments).toEqual([
      {
        text: 'styled',
        fill: 'red',
        opacity: 0.5,
        font: { size: 10, family: 'Inter', weight: 700, style: 'italic' },
      },
    ]);
    expect(resolved.style).toEqual({
      fill: 'red',
      opacity: 0.5,
      font: { size: 10, weight: 700 },
    });
    expect(resolved.mixed).toBe(false);
  });

  it('行级字体省略时不物化继承值，仅覆盖字重时不补入字号', () => {
    const context = { rootFontSize: 16, inheritedFont: { size: 20, family: 'Inter' }, gatingOn: false };
    const omitted = resolveTestLine({ text: 'plain' }, context);
    expect(omitted.style?.font).toBeUndefined();
    const overridden = resolveTestLine({ text: 'bold', font: { weight: 'bold' } }, context);
    expect(overridden.style?.font).toEqual({ weight: 700 });
    expect(overridden.segments).toMatchObject([{ text: 'bold', font: { size: 20, family: 'Inter', weight: 700 } }]);
  });

  it.each([false, true])('显式混排共享行级相对字体并保留片段覆盖，公式简写开关=%s', gatingOn => {
    const resolved = resolveTestLine(
      {
        segments: [
          { text: 'a', font: { family: 'mono', size: '2em' } },
          { tex: 'x', fill: 'blue' },
        ],
        font: { size: '0.5em' },
        fill: 'red',
        opacity: 0,
      },
      {
        rootFontSize: 16,
        inheritedFont: { size: 18, family: 'serif', weight: 400 },
        gatingOn,
      },
    );

    expect(resolved.segments).toEqual([
      { text: 'a', fill: 'red', opacity: 0, font: { size: 18, family: 'mono', weight: 400 } },
      { tex: 'x', fill: 'blue', opacity: 0, fontSize: 9 },
    ]);
    expect(resolved.hasMath).toBe(true);
    expect(resolved.mixed).toBe(true);
  });

  it('保留空的显式片段列表及行级样式', () => {
    const resolved = resolveTestLine(
      { segments: [], font: { size: '0.5em' } },
      { rootFontSize: 16, inheritedFont: { size: 20 }, gatingOn: false },
    );
    expect(resolved).toMatchObject({
      segments: [],
      plainText: '',
      hasMath: false,
      mixed: true,
      style: { font: { size: 10 } },
    });
  });

  it('报告不平衡的 TeX，同时保留尾随字面量', () => {
    const warn = vi.fn();
    const resolved = resolveTestLine('a $b', {
      rootFontSize: 16,
      inheritedFont: { size: 16 },
      gatingOn: true,
      warn,
      warningMessage: 'unbalanced',
    });

    expect(resolved.plainText).toBe('a $b');
    expect(warn).toHaveBeenCalledWith(BuiltinCompileWarningCode.TextTexParseError, 'unbalanced');
  });

  it('使用继承的字体大小来省略行高', () => {
    expect(resolveTextLineHeight(undefined, 20)).toBe(24);
    expect(resolveTextLineHeight(30, 20)).toBe(30);
  });
});
