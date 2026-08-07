import { z } from 'zod';

import type { ThemeTokenContribution, ThemeTokenDefinition } from '../../contract';
import type { IRJsonObject } from '../../schemas';
import type {
  CssColorValue,
  NonEmptyReadonlyArray,
  ResolvedThemeColors,
  ThemeModeValue,
  ThemeStyleValue,
} from '../../shared';

import { defineThemeTokenContribution, defineThemeTokenNamespace } from '../../contract';
import { ThemeMode, ThemeStyle } from '../../shared';
import { cloneAndFreezeJson } from '../../shared/json';

/** Core shared semantic colors 与 categorical palette 的 sparse token 输入 */
export type IRCoreThemeTokenOverrides = Readonly<{
  /** 跨领域错误状态颜色 */
  'semantic.error'?: CssColorValue;
  /** 跨领域成功状态颜色 */
  'semantic.success'?: CssColorValue;
  /** 跨领域警告状态颜色 */
  'semantic.warning'?: CssColorValue;
  /** 当前生效的非空 categorical palette */
  'palette.categorical'?: NonEmptyReadonlyArray<CssColorValue>;
}>;

const CssColorSchema = z.string().min(1).describe('Non-empty CSS color value.');

const CoreThemeTokenObjectSchema = z
  .strictObject({
    'semantic.error': CssColorSchema.optional(),
    'semantic.success': CssColorSchema.optional(),
    'semantic.warning': CssColorSchema.optional(),
    'palette.categorical': z.tuple([CssColorSchema]).rest(CssColorSchema).optional(),
  })
  .describe('Strict sparse Core shared color overrides.');

const isPlainJsonObject = (input: unknown): input is IRJsonObject => {
  try {
    const snapshot = cloneAndFreezeJson(input, 'Core theme token overrides');
    return snapshot !== null && typeof snapshot === 'object' && !Array.isArray(snapshot);
  } catch {
    return false;
  }
};

/** Core shared color schema with accessor-safe JSON validation before strict key validation */
export const CoreThemeTokenSchema: z.ZodType<IRCoreThemeTokenOverrides> = z
  .custom<IRCoreThemeTokenOverrides>(isPlainJsonObject, {
    error: 'Core theme token overrides must be a plain JSON object.',
  })
  .pipe(CoreThemeTokenObjectSchema)
  .describe('Strict sparse Core shared color overrides.');

/** Core 内置 Theme token namespace definition singleton */
export const CoreThemeTokenDefinition: ThemeTokenDefinition<'core', IRCoreThemeTokenOverrides> =
  defineThemeTokenNamespace<'core', IRCoreThemeTokenOverrides>({ namespace: 'core', schema: CoreThemeTokenSchema });

/** 创建冻结、脱离输入的 Core token contribution */
export const defineCoreThemeTokens = (
  overrides: IRCoreThemeTokenOverrides,
): ThemeTokenContribution<'core', IRCoreThemeTokenOverrides> => {
  const parsed = CoreThemeTokenDefinition.schema.parse(overrides);
  return defineThemeTokenContribution({ namespace: 'core', tokens: parsed });
};

type CoreSemanticColors = Readonly<{
  error: CssColorValue;
  success: CssColorValue;
  warning: CssColorValue;
}>;

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

const palette = (...colors: Array<CssColorValue>): NonEmptyReadonlyArray<CssColorValue> => freezeCategorical(colors);

const CORE_COLOR_PRESETS: Readonly<Record<ThemeStyleValue, Readonly<Record<ThemeModeValue, ResolvedThemeColors>>>> =
  Object.freeze({
    [ThemeStyle.Neutral]: Object.freeze({
      [ThemeMode.Light]: freezeColorView(
        { error: '#dc2626', success: '#16a34a', warning: '#d97706' },
        palette('#2563eb', '#7c3aed', '#c026d3', '#db2777', '#ea580c', '#a16207', '#16a34a', '#0f766e', '#0891b2'),
      ),
      [ThemeMode.Dark]: freezeColorView(
        { error: '#f87171', success: '#4ade80', warning: '#fbbf24' },
        palette('#60a5fa', '#a78bfa', '#e879f9', '#f472b6', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#22d3ee'),
      ),
    }),
    [ThemeStyle.Academic]: Object.freeze({
      [ThemeMode.Light]: freezeColorView(
        { error: '#b91c1c', success: '#166534', warning: '#a16207' },
        palette('#1d4ed8', '#4338ca', '#7e22ce', '#be123c', '#c2410c', '#a16207', '#15803d', '#0f766e', '#0e7490'),
      ),
      [ThemeMode.Dark]: freezeColorView(
        { error: '#fca5a5', success: '#86efac', warning: '#fde68a' },
        palette('#93c5fd', '#a5b4fc', '#d8b4fe', '#fda4af', '#fdba74', '#fde68a', '#86efac', '#5eead4', '#67e8f9'),
      ),
    }),
    [ThemeStyle.Vibrant]: Object.freeze({
      [ThemeMode.Light]: freezeColorView(
        { error: '#e11d48', success: '#16a34a', warning: '#f59e0b' },
        palette('#2563eb', '#9333ea', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#4f46e5', '#c026d3'),
      ),
      [ThemeMode.Dark]: freezeColorView(
        { error: '#fb7185', success: '#4ade80', warning: '#fbbf24' },
        palette('#60a5fa', '#c084fc', '#f472b6', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#818cf8', '#e879f9'),
      ),
    }),
    [ThemeStyle.Clean]: Object.freeze({
      [ThemeMode.Light]: freezeColorView(
        { error: '#dc2626', success: '#15803d', warning: '#d97706' },
        palette('#2563eb', '#4f46e5', '#7c3aed', '#c026d3', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2'),
      ),
      [ThemeMode.Dark]: freezeColorView(
        { error: '#f87171', success: '#4ade80', warning: '#fbbf24' },
        palette('#60a5fa', '#818cf8', '#a78bfa', '#e879f9', '#f472b6', '#fb923c', '#facc15', '#4ade80', '#22d3ee'),
      ),
    }),
  });

/** 解析指定 style / mode 的完整 shared colors，并应用 Core sparse overrides */
export const resolveCoreThemeColors = (
  style: ThemeStyleValue,
  mode: ThemeModeValue,
  overrides?: IRCoreThemeTokenOverrides,
): ResolvedThemeColors => {
  const preset = CORE_COLOR_PRESETS[style][mode];

  const parsed = overrides === undefined ? undefined : CoreThemeTokenDefinition.schema.parse(overrides);
  return freezeColorView(
    {
      error: parsed?.['semantic.error'] ?? preset.semantic.error,
      success: parsed?.['semantic.success'] ?? preset.semantic.success,
      warning: parsed?.['semantic.warning'] ?? preset.semantic.warning,
    },
    parsed?.['palette.categorical'] ?? preset.categorical,
  );
};
