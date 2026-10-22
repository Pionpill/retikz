import type { IRGraphicStyle, IRDropShadow, ResolvedDropShadow, ShadowPreset, StrokeDashPattern } from '../../schemas';
import { SHADOW_PRESETS } from '../../schemas';

/** 虚线预设 */
const DASHED_PATTERN: StrokeDashPattern = [4, 2];

/** 点线预设 */
const DOTTED_PATTERN: StrokeDashPattern = [1, 2];

/** 投影缺省颜色 */
const DEFAULT_SHADOW_COLOR = 'rgba(0,0,0,0.5)';

const GRAPHIC_STYLE_KEYS = [
  'color',
  'fill',
  'stroke',
  'strokeWidth',
  'dashPattern',
  'dashOffset',
  'lineCap',
  'lineJoin',
  'opacity',
  'shadow',
  'blendMode',
] as const satisfies ReadonlyArray<keyof IRGraphicStyle>;

/** 提取通用图形样式字段 */
export const pickGraphicStyle = (src: Partial<IRGraphicStyle>): Partial<IRGraphicStyle> => {
  const entries = GRAPHIC_STYLE_KEYS.flatMap(key => {
    const value = src[key];
    return value === undefined ? [] : ([[key, value]] as const);
  });
  return Object.fromEntries(entries);
};

/** 将投影预设与显式覆盖解析为完整内部结构 */
export const resolveDropShadow = (shadow: ShadowPreset | IRDropShadow | undefined): ResolvedDropShadow | undefined => {
  if (shadow === undefined) return undefined;

  if (typeof shadow === 'string') {
    const preset = SHADOW_PRESETS[shadow];
    return preset ? { ...preset } : undefined;
  }

  const { preset, ...explicit } = shadow;
  const base = preset ? SHADOW_PRESETS[preset] : undefined;
  const merged: Omit<IRDropShadow, 'preset'> = { ...(base ?? {}), ...explicit };

  if (merged.offsetX === undefined || merged.offsetY === undefined) return undefined;

  return {
    ...merged,
    offsetX: merged.offsetX,
    offsetY: merged.offsetY,
    color: merged.color ?? DEFAULT_SHADOW_COLOR,
  };
};

/** 将描边虚线简写按显式数组、虚线、点线的优先级解析 */
export const resolveDashPattern = (
  dashPattern: StrokeDashPattern | undefined,
  dashed: boolean | undefined,
  dotted: boolean | undefined,
): StrokeDashPattern | undefined => {
  if (dashPattern !== undefined) return dashPattern;
  if (dashed) return DASHED_PATTERN;
  if (dotted) return DOTTED_PATTERN;

  return undefined;
};
