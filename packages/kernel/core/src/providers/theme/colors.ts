import type {
  BuiltinThemeStyleValue,
  CssColorValue,
  NonEmptyReadonlyArray,
  ResolvedThemeColors,
  ThemeModeValue,
} from '../../shared';

import { ThemeMode, ThemeStyle } from '../../shared';

type CoreSemanticColors = Readonly<{
  error: CssColorValue;
  success: CssColorValue;
  warning: CssColorValue;
}>;

type CategoricalTone = Readonly<{
  saturation: number;
  lightness: number;
}>;

/** 前八项优先保证类别区分，后八项补充剩余色相空间 */
const categoricalHues = [210, 30, 150, 330, 190, 10, 50, 270, 100, 240, 300, 350, 75, 125, 170, 225] as const;

type CategoricalToneVector = ReadonlyArray<CategoricalTone>;

const tones = (...values: Array<readonly [saturation: number, lightness: number]>): CategoricalToneVector =>
  values.map(([saturation, lightness]) => ({ saturation, lightness }));

/** 每种内建风格按公共 Hue 索引维护独立色调，并为明暗模式分别适配 */
const categoricalTones: Readonly<
  Record<BuiltinThemeStyleValue, Readonly<Record<ThemeModeValue, CategoricalToneVector>>>
> = {
  [ThemeStyle.Academic]: {
    [ThemeMode.Light]: tones(
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
    ),
    [ThemeMode.Dark]: tones(
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
    ),
  },
  [ThemeStyle.Neutral]: {
    [ThemeMode.Light]: tones(
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
    ),
    [ThemeMode.Dark]: tones(
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
    ),
  },
  [ThemeStyle.Clean]: {
    [ThemeMode.Light]: tones(
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
    ),
    [ThemeMode.Dark]: tones(
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
    ),
  },
  [ThemeStyle.Vibrant]: {
    [ThemeMode.Light]: tones(
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
    ),
    [ThemeMode.Dark]: tones(
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
    ),
  },
};

const freezeCategorical = (palette: ReadonlyArray<CssColorValue>): NonEmptyReadonlyArray<CssColorValue> => {
  if (palette.length === 0) throw new Error('Core categorical palette must not be empty.');
  return Object.freeze([...palette]) as NonEmptyReadonlyArray<CssColorValue>;
};

const freezeColorView = (
  semantic: CoreSemanticColors,
  categorical: ReadonlyArray<CssColorValue>,
): ResolvedThemeColors =>
  Object.freeze({
    semantic: Object.freeze({ ...semantic }),
    categorical: freezeCategorical(categorical),
  });

/** 通过公共色相序列与主题色调正交生成分类色 */
const createCategoricalPalette = (
  style: BuiltinThemeStyleValue,
  mode: ThemeModeValue,
): NonEmptyReadonlyArray<CssColorValue> => {
  const toneVector = categoricalTones[style][mode];
  return freezeCategorical(
    categoricalHues.map((hue, index) => {
      const tone = toneVector[index];
      return `hsl(${hue}, ${tone.saturation}%, ${tone.lightness}%)`;
    }),
  );
};

const CORE_COLOR_PRESETS: Readonly<
  Record<BuiltinThemeStyleValue, Readonly<Record<ThemeModeValue, ResolvedThemeColors>>>
> = Object.freeze({
  [ThemeStyle.Neutral]: Object.freeze({
    [ThemeMode.Light]: freezeColorView(
      {
        error: 'hsl(0, 60%, 53%)',
        success: 'hsl(145, 45%, 42%)',
        warning: 'hsl(48, 75%, 42%)',
      },
      createCategoricalPalette(ThemeStyle.Neutral, ThemeMode.Light),
    ),
    [ThemeMode.Dark]: freezeColorView(
      {
        error: 'hsl(0, 65%, 70%)',
        success: 'hsl(145, 48%, 65%)',
        warning: 'hsl(50, 78%, 65%)',
      },
      createCategoricalPalette(ThemeStyle.Neutral, ThemeMode.Dark),
    ),
  }),
  [ThemeStyle.Academic]: Object.freeze({
    [ThemeMode.Light]: freezeColorView(
      {
        error: 'hsl(0, 68%, 42%)',
        success: 'hsl(145, 50%, 32%)',
        warning: 'hsl(48, 80%, 38%)',
      },
      createCategoricalPalette(ThemeStyle.Academic, ThemeMode.Light),
    ),
    [ThemeMode.Dark]: freezeColorView(
      {
        error: 'hsl(0, 60%, 72%)',
        success: 'hsl(145, 50%, 68%)',
        warning: 'hsl(50, 75%, 70%)',
      },
      createCategoricalPalette(ThemeStyle.Academic, ThemeMode.Dark),
    ),
  }),
  [ThemeStyle.Vibrant]: Object.freeze({
    [ThemeMode.Light]: freezeColorView(
      {
        error: 'hsl(355, 80%, 57%)',
        success: 'hsl(145, 65%, 42%)',
        warning: 'hsl(50, 90%, 46%)',
      },
      createCategoricalPalette(ThemeStyle.Vibrant, ThemeMode.Light),
    ),
    [ThemeMode.Dark]: freezeColorView(
      {
        error: 'hsl(355, 78%, 72%)',
        success: 'hsl(145, 62%, 66%)',
        warning: 'hsl(50, 88%, 68%)',
      },
      createCategoricalPalette(ThemeStyle.Vibrant, ThemeMode.Dark),
    ),
  }),
  [ThemeStyle.Clean]: Object.freeze({
    [ThemeMode.Light]: freezeColorView(
      {
        error: 'hsl(0, 55%, 58%)',
        success: 'hsl(145, 38%, 47%)',
        warning: 'hsl(50, 62%, 47%)',
      },
      createCategoricalPalette(ThemeStyle.Clean, ThemeMode.Light),
    ),
    [ThemeMode.Dark]: freezeColorView(
      {
        error: 'hsl(0, 50%, 72%)',
        success: 'hsl(145, 38%, 68%)',
        warning: 'hsl(50, 60%, 68%)',
      },
      createCategoricalPalette(ThemeStyle.Clean, ThemeMode.Dark),
    ),
  }),
});

/** 解析指定 style / mode 与 palette preset 的完整 shared colors */
export const resolveCoreThemeColors = (style: BuiltinThemeStyleValue, mode: ThemeModeValue): ResolvedThemeColors => {
  const preset = CORE_COLOR_PRESETS[style][mode];
  return freezeColorView(
    {
      error: preset.semantic.error,
      success: preset.semantic.success,
      warning: preset.semantic.warning,
    },
    preset.categorical,
  );
};
