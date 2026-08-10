import { describe, expect, it } from 'vitest';

import { resolveCoreThemeColors, ThemeMode, ThemeStyle } from '../../../src';

const categoricalHues = [210, 30, 150, 330, 190, 10, 50, 270, 100, 240, 300, 350, 75, 125, 170, 225];

const cases = [
  [
    ThemeStyle.Academic,
    ThemeMode.Light,
    [
      [93, 43],
      [100, 43],
      [83, 28],
      [56, 42],
      [83, 62],
      [100, 43],
      [90, 56],
      [56, 42],
      [68, 31],
      [72, 34],
      [50, 55],
      [56, 42],
      [61, 46],
      [83, 28],
      [93, 30],
      [93, 43],
    ],
  ],
  [
    ThemeStyle.Academic,
    ThemeMode.Dark,
    [
      [82, 76],
      [88, 76],
      [73, 78],
      [49, 77],
      [73, 66],
      [88, 76],
      [79, 69],
      [49, 77],
      [60, 78],
      [63, 78],
      [44, 70],
      [49, 77],
      [54, 75],
      [73, 78],
      [82, 78],
      [82, 76],
    ],
  ],
  [
    ThemeStyle.Neutral,
    ThemeMode.Light,
    [
      [48, 46],
      [94, 53],
      [40, 53],
      [54, 65],
      [66, 49],
      [24, 50],
      [80, 54],
      [35, 58],
      [43, 44],
      [38, 51],
      [39, 62],
      [91, 72],
      [74, 48],
      [51, 42],
      [46, 54],
      [48, 46],
    ],
  ],
  [
    ThemeStyle.Neutral,
    ThemeMode.Dark,
    [
      [42, 75],
      [83, 71],
      [35, 71],
      [48, 64],
      [58, 73],
      [22, 73],
      [70, 70],
      [31, 68],
      [38, 76],
      [33, 72],
      [34, 66],
      [80, 62],
      [65, 74],
      [45, 77],
      [40, 70],
      [42, 75],
    ],
  ],
  [
    ThemeStyle.Clean,
    ThemeMode.Light,
    [
      [28, 46],
      [32, 54],
      [28, 40],
      [32, 50],
      [28, 44],
      [32, 48],
      [12, 60],
      [32, 42],
      [28, 52],
      [32, 38],
      [32, 56],
      [32, 46],
      [30, 58],
      [28, 42],
      [28, 50],
      [28, 36],
    ],
  ],
  [
    ThemeStyle.Clean,
    ThemeMode.Dark,
    [
      [30, 74],
      [30, 66],
      [30, 76],
      [30, 68],
      [30, 72],
      [30, 64],
      [30, 78],
      [30, 70],
      [30, 68],
      [30, 76],
      [30, 66],
      [30, 72],
      [30, 64],
      [30, 74],
      [30, 70],
      [30, 78],
    ],
  ],
  [
    ThemeStyle.Vibrant,
    ThemeMode.Light,
    [
      [81, 51],
      [96, 60],
      [42, 50],
      [58, 57],
      [55, 37],
      [58, 60],
      [95, 48],
      [51, 42],
      [49, 41],
      [71, 40],
      [78, 34],
      [89, 73],
      [95, 48],
      [40, 45],
      [42, 50],
      [67, 39],
    ],
  ],
  [
    ThemeStyle.Vibrant,
    ThemeMode.Dark,
    [
      [71, 72],
      [84, 67],
      [37, 73],
      [51, 69],
      [48, 78],
      [51, 67],
      [84, 74],
      [45, 77],
      [43, 77],
      [62, 78],
      [69, 78],
      [78, 62],
      [84, 74],
      [35, 75],
      [37, 73],
      [59, 78],
    ],
  ],
] as const;

describe('Core theme colors', () => {
  it.each(cases)('%s/%s 的 semantic colors 使用 HSL', (style, mode) => {
    const colors = resolveCoreThemeColors(style, mode);

    for (const color of Object.values(colors.semantic)) {
      expect(color).toMatch(/^hsl\(.+\)$/);
    }
  });

  it.each(cases)('%s/%s 保留公共 Hue 并使用逐项主题色调', (style, mode, toneVector) => {
    const colors = resolveCoreThemeColors(style, mode).categorical;

    expect(colors).toHaveLength(categoricalHues.length);
    expect(colors).toEqual(
      categoricalHues.map((hue, index) => {
        const [saturation, lightness] = toneVector[index];
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      }),
    );
  });
});
