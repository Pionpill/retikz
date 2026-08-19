import { describe, expect, it, vi } from 'vitest';

import { CompileWarningCode } from '../../src/compile/constants';
import {
  parseInlineRuns,
  resolveFont,
  resolveFontSize,
  resolveTextLine,
  resolveTextLineHeight,
} from '../../src/resolve/text';

describe('resolve text', () => {
  it('resolves font presets and relative units', () => {
    expect(resolveFontSize('sm', { rootFontSize: 20, inheritedFontSize: 12 })).toBe(17.5);
    expect(resolveFontSize('1.25rem', { rootFontSize: 20, inheritedFontSize: 12 })).toBe(25);
    expect(resolveFontSize('0.5em', { rootFontSize: 20, inheritedFontSize: 12 })).toBe(6);
  });

  it('inherits missing font fields independently', () => {
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

  it('resolves string shorthand and TeX gating', () => {
    const inheritedFont = { size: 16, family: 'serif' } as const;
    expect(
      resolveTextLine('a $x$ b', {
        rootFontSize: 16,
        inheritedFont,
        gatingOn: false,
      }),
    ).toMatchObject({
      runs: [{ text: 'a $x$ b', font: inheritedFont }],
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
      runs: [{ text: 'a ', font: inheritedFont }, { tex: 'x' }, { text: ' b', font: inheritedFont }],
      plainText: 'a  b',
      hasMath: true,
      mixed: true,
    });
  });

  it('folds styled-line paint and resolves its font without emitting inherited style', () => {
    const resolved = resolveTextLine(
      { text: 'styled', fill: 'red', opacity: 0.5, font: { size: '0.5em', weight: 'bold' } },
      {
        rootFontSize: 16,
        inheritedFont: { size: 20, family: 'Inter', style: 'italic' },
        gatingOn: true,
      },
    );

    expect(resolved.runs).toEqual([
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

  it('preserves explicit mixed runs and resolves text-run fonts', () => {
    const resolved = resolveTextLine(
      {
        runs: [
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

    expect(resolved.runs).toEqual([
      { text: 'a', font: { size: 18, family: 'mono', weight: 400 } },
      { tex: 'x', fill: 'blue' },
    ]);
    expect(resolved.hasMath).toBe(true);
    expect(resolved.mixed).toBe(true);
  });

  it('reports unbalanced TeX while preserving the trailing literal', () => {
    const warn = vi.fn();
    const resolved = resolveTextLine('a $b', {
      rootFontSize: 16,
      inheritedFont: { size: 16 },
      gatingOn: true,
      warn,
      warningMessage: 'unbalanced',
    });

    expect(resolved.plainText).toBe('a $b');
    expect(warn).toHaveBeenCalledWith(CompileWarningCode.TextTexParseError, 'unbalanced');
  });

  it('uses the inherited font size for omitted line height', () => {
    expect(resolveTextLineHeight(undefined, 20)).toBe(24);
    expect(resolveTextLineHeight(30, 20)).toBe(30);
  });

  it('keeps the inline parser available from the text resolver owner', () => {
    expect(parseInlineRuns('$x$', true)).toEqual({ runs: [{ tex: 'x' }], hasMath: true, warn: false });
  });
});
