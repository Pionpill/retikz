import { assertPlainDataContainers } from '@retikz/foundation';
import { z } from 'zod';

import type { ThemeStyleColorOverrides } from '../../contract';
import type {
  CoreSemanticColors,
  CssColorValue,
  NonEmptyReadonlyArray,
  ResolvedThemeColors,
  ThemeModeValue,
} from '../../shared';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { CssColorSchema } from '../../schemas';
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

const semanticColorKeys = new Set(['error', 'success', 'warning', 'guide']);
const themeStyleColorKeys = new Set(['semantic', 'categorical']);

/** 判断 runtime provider 输出是否为可枚举的普通对象 */
const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const ThemeStyleColorOverridesSchema = z
  .custom<Record<string, unknown>>(isPlainRecord, {
    error: 'Theme style color definition must return a plain object.',
  })
  .pipe(
    z.strictObject({
      semantic: z
        .strictObject({
          error: CssColorSchema.optional(),
          success: CssColorSchema.optional(),
          warning: CssColorSchema.optional(),
          guide: CssColorSchema.optional(),
        })
        .optional(),
      categorical: z.array(CssColorSchema).min(1).optional(),
    }),
  );

const ThemeStyleColorPlainDataSchema = z.custom<unknown>(
  value => {
    try {
      assertPlainDataContainers(value, 'Theme style color definition output');
      return true;
    } catch {
      return false;
    }
  },
  { error: 'Theme style color definition must return JSON-safe plain data.' },
);

/** 只把 runtime style definition 中已知且显式为 undefined 的字段规范化为省略 */
const omitKnownUndefinedProperties = (value: unknown, knownKeys: ReadonlySet<string>): unknown => {
  if (!isPlainRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => item !== undefined || !knownKeys.has(key)));
};

/** 规范化 Core runtime style 的已知 sparse 字段，同时保留未知字段交给严格 schema */
const normalizeThemeStyleColorOverrides = (overrides: unknown): unknown => {
  const normalized = omitKnownUndefinedProperties(overrides, themeStyleColorKeys);
  if (!isPlainRecord(normalized) || !Object.hasOwn(normalized, 'semantic')) return normalized;
  return {
    ...normalized,
    semantic: omitKnownUndefinedProperties(normalized.semantic, semanticColorKeys),
  };
};

/** 解析默认 baseline 的完整 shared colors */
export const resolveDefaultCoreThemeColors = (mode: ThemeModeValue): ResolvedThemeColors => {
  const preset = CORE_COLOR_PRESETS[mode];
  return freezeColorView(preset.semantic, preset.categorical);
};

/** 按当前 mode 的默认 shared colors 补全一层 Theme style 稀疏覆盖 */
export const resolveCoreThemeStyleColors = (
  mode: ThemeModeValue,
  overrides: ThemeStyleColorOverrides,
): ResolvedThemeColors => {
  const preset = CORE_COLOR_PRESETS[mode];
  ThemeStyleColorPlainDataSchema.parse(overrides);
  const normalized = normalizeThemeStyleColorOverrides(overrides);
  const parsed = ThemeStyleColorOverridesSchema.parse(normalized);
  return freezeColorView(
    {
      error: parsed.semantic?.error ?? preset.semantic.error,
      success: parsed.semantic?.success ?? preset.semantic.success,
      warning: parsed.semantic?.warning ?? preset.semantic.warning,
      guide: parsed.semantic?.guide ?? preset.semantic.guide,
    },
    parsed.categorical ?? preset.categorical,
  );
};
