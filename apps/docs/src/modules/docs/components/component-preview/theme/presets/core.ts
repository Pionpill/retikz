import type { CssColorValue, NonEmptyReadonlyArray, ThemeModeValue, ThemeStyleColorOverrides } from '@retikz/core';

import { defineThemeStyle } from '@retikz/core';

import { PreviewThemeStyle } from '../constants';

type ReferenceStyle = Exclude<(typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle], 'default'>;
type Tone = readonly [saturation: number, lightness: number];

const hues = [210, 30, 150, 330, 190, 10, 50, 270, 100, 240, 300, 350, 75, 125, 170, 225] as const;

const tonePresets: Record<ReferenceStyle, Record<ThemeModeValue, ReadonlyArray<Tone>>> = {
  academic: {
    light: [
      [44, 49],
      [72, 56],
      [44, 48],
      [60, 58],
      [42, 54],
      [64, 53],
      [68, 56],
      [40, 54],
      [48, 48],
      [40, 50],
      [46, 56],
      [58, 54],
      [54, 50],
      [42, 46],
      [44, 52],
      [44, 50],
    ],
    dark: [
      [52, 60],
      [82, 59],
      [62, 53],
      [72, 62],
      [54, 59],
      [76, 58],
      [82, 56],
      [50, 62],
      [62, 54],
      [50, 60],
      [58, 61],
      [72, 60],
      [66, 56],
      [58, 53],
      [58, 56],
      [52, 60],
    ],
  },
  vibrant: {
    light: [
      [70, 54],
      [88, 54],
      [55, 47],
      [85, 63],
      [55, 52],
      [90, 60],
      [88, 52],
      [78, 62],
      [62, 48],
      [68, 57],
      [80, 60],
      [90, 64],
      [75, 50],
      [58, 46],
      [52, 54],
      [72, 56],
    ],
    dark: [
      [76, 64],
      [88, 62],
      [62, 58],
      [88, 68],
      [62, 62],
      [92, 65],
      [90, 60],
      [82, 68],
      [68, 58],
      [74, 65],
      [84, 67],
      [92, 69],
      [80, 58],
      [64, 57],
      [60, 63],
      [78, 65],
    ],
  },
  clean: {
    light: [
      [40, 58],
      [62, 61],
      [45, 52],
      [55, 64],
      [42, 56],
      [60, 60],
      [68, 58],
      [42, 60],
      [50, 55],
      [40, 57],
      [48, 62],
      [58, 62],
      [55, 56],
      [44, 53],
      [42, 55],
      [40, 54],
    ],
    dark: [
      [42, 64],
      [60, 63],
      [46, 60],
      [54, 67],
      [44, 63],
      [58, 64],
      [62, 61],
      [44, 66],
      [48, 60],
      [42, 64],
      [46, 67],
      [56, 66],
      [52, 61],
      [46, 60],
      [44, 62],
      [42, 63],
    ],
  },
};

const semanticPresets: Record<
  ReferenceStyle,
  Record<ThemeModeValue, NonNullable<ThemeStyleColorOverrides['semantic']>>
> = {
  academic: {
    light: {
      error: 'hsl(0, 68%, 42%)',
      success: 'hsl(145, 50%, 32%)',
      warning: 'hsl(48, 80%, 38%)',
    },
    dark: {
      error: 'hsl(0, 60%, 72%)',
      success: 'hsl(145, 50%, 68%)',
      warning: 'hsl(50, 75%, 70%)',
    },
  },
  vibrant: {
    light: {
      error: 'hsl(355, 80%, 57%)',
      success: 'hsl(145, 65%, 42%)',
      warning: 'hsl(50, 90%, 46%)',
    },
    dark: {
      error: 'hsl(355, 78%, 72%)',
      success: 'hsl(145, 62%, 66%)',
      warning: 'hsl(50, 88%, 68%)',
    },
  },
  clean: {
    light: {
      error: 'hsl(0, 55%, 58%)',
      success: 'hsl(145, 38%, 47%)',
      warning: 'hsl(50, 62%, 47%)',
    },
    dark: {
      error: 'hsl(0, 50%, 72%)',
      success: 'hsl(145, 38%, 68%)',
      warning: 'hsl(50, 60%, 68%)',
    },
  },
};

const resolveColors = (style: ReferenceStyle, mode: ThemeModeValue): ThemeStyleColorOverrides => {
  const categorical = hues.map((hue, index) => {
    const [saturation, lightness] = tonePresets[style][mode][index];
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }) as unknown as NonEmptyReadonlyArray<CssColorValue>;
  return { semantic: semanticPresets[style][mode], categorical };
};

/** docs 维护的三个 Core reference Theme definitions */
export const PreviewCoreThemeStyles = [
  PreviewThemeStyle.Academic,
  PreviewThemeStyle.Vibrant,
  PreviewThemeStyle.Clean,
].map(style => defineThemeStyle({ name: style, resolve: ({ mode }) => resolveColors(style, mode) }));
