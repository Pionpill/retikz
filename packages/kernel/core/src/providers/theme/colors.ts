import type {
  CoreSemanticColors,
  CssColorValue,
  NonEmptyReadonlyArray,
  ResolvedThemeColors,
  ThemeModeValue,
} from '../../shared';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { ThemeMode } from '../../shared';

type CategoricalTone = Readonly<{
  saturation: number;
  lightness: number;
}>;

/** 前八项优先保证类别区分，后八项补充剩余色相空间 */
const categoricalHues = [210, 30, 150, 330, 190, 10, 50, 270, 100, 240, 300, 350, 75, 125, 170, 225] as const;

const tones = (...values: Array<readonly [saturation: number, lightness: number]>): ReadonlyArray<CategoricalTone> =>
  values.map(([saturation, lightness]) => ({ saturation, lightness }));

/** 默认 baseline 按公共 Hue 索引维护独立色调，并为明暗模式分别适配 */
const categoricalTones: Readonly<Record<ThemeModeValue, ReadonlyArray<CategoricalTone>>> = {
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
};

const freezeCategorical = (palette: ReadonlyArray<CssColorValue>): NonEmptyReadonlyArray<CssColorValue> => {
  if (palette.length === 0)
    throw new RetikzCoreError(RetikzCoreErrorCode.Provider, 'Core categorical palette must not be empty.');
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

const createCategoricalPalette = (mode: ThemeModeValue): NonEmptyReadonlyArray<CssColorValue> => {
  const toneVector = categoricalTones[mode];
  return freezeCategorical(
    categoricalHues.map((hue, index) => {
      const tone = toneVector[index];
      return `hsl(${hue}, ${tone.saturation}%, ${tone.lightness}%)`;
    }),
  );
};

const CORE_COLOR_PRESETS: Readonly<Record<ThemeModeValue, ResolvedThemeColors>> = Object.freeze({
  [ThemeMode.Light]: freezeColorView(
    {
      error: 'hsl(0, 60%, 53%)',
      success: 'hsl(145, 45%, 42%)',
      warning: 'hsl(48, 75%, 42%)',
      guide: 'hsl(215, 12%, 48%)',
    },
    createCategoricalPalette(ThemeMode.Light),
  ),
  [ThemeMode.Dark]: freezeColorView(
    {
      error: 'hsl(0, 65%, 70%)',
      success: 'hsl(145, 48%, 65%)',
      warning: 'hsl(50, 78%, 65%)',
      guide: 'hsl(215, 14%, 68%)',
    },
    createCategoricalPalette(ThemeMode.Dark),
  ),
});

/** 解析默认 baseline 的完整 shared colors */
export const resolveDefaultCoreThemeColors = (mode: ThemeModeValue): ResolvedThemeColors => {
  const preset = CORE_COLOR_PRESETS[mode];
  return freezeColorView(preset.semantic, preset.categorical);
};
