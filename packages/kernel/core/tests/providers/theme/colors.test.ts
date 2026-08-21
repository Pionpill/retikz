import { describe, expect, it } from 'vitest';

import { resolveDefaultCoreThemeColors, ThemeMode } from '../../../src';

const categoricalHues = [210, 30, 150, 330, 190, 10, 50, 270, 100, 240, 300, 350, 75, 125, 170, 225];

const cases = [
  [
    ThemeMode.Light,
    [
      [38, 48],
      [78, 55],
      [36, 48],
      [44, 59],
      [36, 53],
      [58, 55],
      [72, 53],
      [38, 56],
      [38, 46],
      [40, 53],
      [38, 58],
      [62, 62],
      [50, 52],
      [38, 45],
      [34, 55],
      [40, 49],
    ],
    {
      error: 'hsl(0, 60%, 53%)',
      success: 'hsl(145, 45%, 42%)',
      warning: 'hsl(48, 75%, 42%)',
      guide: 'hsl(215, 12%, 48%)',
    },
  ],
  [
    ThemeMode.Dark,
    [
      [50, 60],
      [80, 60],
      [50, 55],
      [62, 64],
      [48, 58],
      [70, 60],
      [80, 58],
      [50, 64],
      [52, 56],
      [50, 62],
      [52, 64],
      [70, 65],
      [60, 57],
      [50, 55],
      [48, 59],
      [50, 61],
    ],
    {
      error: 'hsl(0, 65%, 70%)',
      success: 'hsl(145, 48%, 65%)',
      warning: 'hsl(50, 78%, 65%)',
      guide: 'hsl(215, 14%, 68%)',
    },
  ],
] as const;

describe('Core default theme colors', () => {
  it('不公开内置 ThemeStyle', () => {
    expect(resolveDefaultCoreThemeColors(ThemeMode.Light)).toBeDefined();
  });

  it.each(cases)('%s 使用对应 semantic colors', (mode, _toneVector, semantic) => {
    expect(resolveDefaultCoreThemeColors(mode).semantic).toEqual(semantic);
  });

  it.each(cases)('%s 保留公共 Hue 并使用逐项色调', (mode, toneVector) => {
    expect(resolveDefaultCoreThemeColors(mode).categorical).toEqual(
      categoricalHues.map((hue, index) => {
        const [saturation, lightness] = toneVector[index];
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      }),
    );
  });
});
