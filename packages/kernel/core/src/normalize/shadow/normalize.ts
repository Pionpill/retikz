import type { IRDropShadow, ShadowPresetValue } from '../../schemas';
import type { CanonicalDropShadow } from './types';

import { SHADOW_PRESETS } from '../../schemas';

/** 投影缺省颜色 */
const DEFAULT_SHADOW_COLOR = 'rgba(0,0,0,0.5)';

/** 将投影预设与显式覆盖展开为完整内部形态 */
export const normalizeShadow = (
  shadow: ShadowPresetValue | IRDropShadow | undefined,
): CanonicalDropShadow | undefined => {
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
