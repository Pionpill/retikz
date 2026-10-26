import { describe, expect, it, vi } from 'vitest';

import { BuiltinCompileWarningCode } from '../../src/compile/constants';
import {
  parseInlineSegments,
  resolveFont,
  resolveFontSize,
  resolveTextLine,
  resolveTextLineHeight,
} from '../../src/resolve/text';

describe('解析文本', () => {
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
    ).toEqual({ size: 10, family: 'Inter', weight: 'bold', style: 'italic' });
  });

  it('解析字符串简写和 TeX 门控', () => {
    const inheritedFont = { size: 16, family: 'serif' } as const;

    expect(
      resolveTextLine('a $x$ b', {
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
      resolveTextLine('a $x$ b', {
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
    const resolved = resolveTextLine(
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
        font: { size: 10, family: 'Inter', weight: 'bold', style: 'italic' },
      },
    ]);
    expect(resolved.style).toEqual({
      fill: 'red',
      opacity: 0.5,
      fontSize: 10,
      fontWeight: 'bold',
    });
    expect(resolved.mixed).toBe(false);
  });

  it('保留显式混合段并解析文本段字体', () => {
    const resolved = resolveTextLine(
      {
        segments: [
          { text: 'a', font: { family: 'mono' } },
          { tex: 'x', fill: 'blue' },
        ],
      },
      {
        rootFontSize: 16,
        inheritedFont: { size: 18, family: 'serif', weight: 400 },
        gatingOn: true,
      },
    );

    expect(resolved.segments).toEqual([
      { text: 'a', font: { size: 18, family: 'mono', weight: 400 } },
      { tex: 'x', fill: 'blue', fontSize: 18 },
    ]);
    expect(resolved.hasMath).toBe(true);
    expect(resolved.mixed).toBe(true);
  });

  it('报告不平衡的 TeX，同时保留尾随字面量', () => {
    const warn = vi.fn();
    const resolved = resolveTextLine('a $b', {
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

  it('保持内联解析器对文本解析器所属模块可用', () => {
    expect(parseInlineSegments('$x$', true)).toEqual({ segments: [{ tex: 'x' }], hasMath: true, warn: false });
  });
});
