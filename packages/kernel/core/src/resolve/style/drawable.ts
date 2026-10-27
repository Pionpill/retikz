import type { IRDropShadow, CanonicalDropShadow, ShadowPreset, StrokeDashPattern } from '../../schemas';
import { SHADOW_PRESETS } from '../../schemas';

/** 虚线预设 */
const DASHED_PATTERN: StrokeDashPattern = [4, 2];

/** 点线预设 */
const DOTTED_PATTERN: StrokeDashPattern = [1, 2];

/** 投影缺省颜色 */
const DEFAULT_SHADOW_COLOR = 'rgba(0,0,0,0.5)';

/** 合并阴影预设与显式配置；未提供阴影或合并后缺少任一偏移量时返回 undefined */
export const resolveDropShadow = (shadow: ShadowPreset | IRDropShadow | undefined): CanonicalDropShadow | undefined => {
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
