import type { IRDropShadow, ResolvedDropShadow, ShadowPresetValue } from '../../schemas';

import { SHADOW_PRESETS } from '../../schemas';

/** shadow color 缺省（半透明黑）；preset 与显式 color 均未给时兜底 */
const DEFAULT_SHADOW_COLOR = 'rgba(0,0,0,0.5)';

/**
 * 把 IR 的 shadow（预设字符串 | 对象 | undefined）展开成 renderer 只见的 `ResolvedDropShadow`
 * @description 字符串预设 → `SHADOW_PRESETS` 查表（克隆；`none` → undefined）；对象 →
 *   `{ ...(preset ? SHADOW_PRESETS[preset] : {}), ...显式出现的字段 }`（显式字段逐项覆盖 preset，输出去掉 `preset` key）。
 *   合并后若仍无 offsetX/offsetY（preset 为 `none` 且无显式偏移）→ undefined。color 缺省补 `rgba(0,0,0,0.5)`。
 */
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
