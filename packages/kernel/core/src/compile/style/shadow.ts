import type { IRDropShadow, ResolvedDropShadow, ShadowPresetValue } from '../../schemas';

import { SHADOW_PRESETS } from '../../schemas';

/** shadow color 缺省（半透明黑）；preset 与显式 color 均未给时兜底 */
const DEFAULT_SHADOW_COLOR = 'rgba(0,0,0,0.5)';

/** 把 IR shadow 展开为 renderer 可直接消费的投影对象 */
export const resolveShadow = (shadow: ShadowPresetValue | IRDropShadow | undefined): ResolvedDropShadow | undefined => {
  if (shadow === undefined) return undefined;

  if (typeof shadow === 'string') {
    const preset = SHADOW_PRESETS[shadow];
    return preset ? { ...preset } : undefined;
  }

  const { preset, ...explicit } = shadow;
  const base = preset ? SHADOW_PRESETS[preset] : undefined;
  // explicit 来自 zod parse 后的对象：未给的 optional 字段缺席（非 undefined），逐项覆盖 preset 基底
  const merged: Omit<IRDropShadow, 'preset'> = { ...(base ?? {}), ...explicit };

  if (merged.offsetX === undefined || merged.offsetY === undefined) return undefined;
  return {
    ...merged,
    offsetX: merged.offsetX,
    offsetY: merged.offsetY,
    color: merged.color ?? DEFAULT_SHADOW_COLOR,
  };
};
