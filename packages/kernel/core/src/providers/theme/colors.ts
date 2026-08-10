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
    ),
    [ThemeMode.Dark]: tones(
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
    ),
  },
  [ThemeStyle.Neutral]: {
    [ThemeMode.Light]: tones(
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
    ),
    [ThemeMode.Dark]: tones(
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
    ),
  },
  [ThemeStyle.Clean]: {
    [ThemeMode.Light]: tones(
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
    ),
    [ThemeMode.Dark]: tones(
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
    ),
  },
  [ThemeStyle.Vibrant]: {
    [ThemeMode.Light]: tones(
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
    ),
    [ThemeMode.Dark]: tones(
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
        error: 'hsl(0, 72.22%, 50.59%)',
        success: 'hsl(142.13, 76.22%, 36.27%)',
        warning: 'hsl(32.13, 94.62%, 43.73%)',
      },
      createCategoricalPalette(ThemeStyle.Neutral, ThemeMode.Light),
    ),
    [ThemeMode.Dark]: freezeColorView(
      {
        error: 'hsl(0, 90.6%, 70.78%)',
        success: 'hsl(141.89, 69.16%, 58.04%)',
        warning: 'hsl(43.26, 96.41%, 56.27%)',
      },
      createCategoricalPalette(ThemeStyle.Neutral, ThemeMode.Dark),
    ),
  }),
  [ThemeStyle.Academic]: Object.freeze({
    [ThemeMode.Light]: freezeColorView(
      {
        error: 'hsl(0, 73.71%, 41.76%)',
        success: 'hsl(142.78, 64.23%, 24.12%)',
        warning: 'hsl(35.45, 91.67%, 32.94%)',
      },
      createCategoricalPalette(ThemeStyle.Academic, ThemeMode.Light),
    ),
    [ThemeMode.Dark]: freezeColorView(
      {
        error: 'hsl(0, 93.55%, 81.76%)',
        success: 'hsl(141.71, 76.64%, 73.14%)',
        warning: 'hsl(48, 96.64%, 76.67%)',
      },
      createCategoricalPalette(ThemeStyle.Academic, ThemeMode.Dark),
    ),
  }),
  [ThemeStyle.Vibrant]: Object.freeze({
    [ThemeMode.Light]: freezeColorView(
      {
        error: 'hsl(346.84, 77.17%, 49.8%)',
        success: 'hsl(142.13, 76.22%, 36.27%)',
        warning: 'hsl(37.69, 92.13%, 50.2%)',
      },
      createCategoricalPalette(ThemeStyle.Vibrant, ThemeMode.Light),
    ),
    [ThemeMode.Dark]: freezeColorView(
      {
        error: 'hsl(351.3, 94.52%, 71.37%)',
        success: 'hsl(141.89, 69.16%, 58.04%)',
        warning: 'hsl(43.26, 96.41%, 56.27%)',
      },
      createCategoricalPalette(ThemeStyle.Vibrant, ThemeMode.Dark),
    ),
  }),
  [ThemeStyle.Clean]: Object.freeze({
    [ThemeMode.Light]: freezeColorView(
      {
        error: 'hsl(0, 72.22%, 50.59%)',
        success: 'hsl(142.43, 71.81%, 29.22%)',
        warning: 'hsl(32.13, 94.62%, 43.73%)',
      },
      createCategoricalPalette(ThemeStyle.Clean, ThemeMode.Light),
    ),
    [ThemeMode.Dark]: freezeColorView(
      {
        error: 'hsl(0, 90.6%, 70.78%)',
        success: 'hsl(141.89, 69.16%, 58.04%)',
        warning: 'hsl(43.26, 96.41%, 56.27%)',
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
