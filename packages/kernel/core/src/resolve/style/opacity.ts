import { mergeProperties } from '@retikz/foundation';

import type { IRGraphicStyle } from '../../schemas';
import type { GraphicOpacityResolution } from './types';

/** 将简写投影为逐项覆盖输入，不提前填入默认值 */
const opacityFactors = (value: IRGraphicStyle['opacity']) => (typeof value === 'number' ? { overall: value } : value);

/** 按独立因子覆盖图形样式，缺失和 undefined 不清除继承 */
export const mergeGraphicStyle = <T extends IRGraphicStyle>(...styles: Array<T | undefined>): Partial<T> => {
  const merged = mergeProperties<T>(styles, { shouldOverride: value => value !== undefined });
  const factors = mergeProperties(
    styles.map(style => opacityFactors(style?.opacity)),
    {
      shouldOverride: value => value !== undefined,
    },
  );
  if (Object.keys(factors).length > 0) merged.opacity = factors;
  return merged;
};

/** 把已完成继承的 Source 透明度投影为 Scene 因子 */
export const resolveGraphicOpacity = (value: IRGraphicStyle['opacity']): GraphicOpacityResolution => {
  const factors = opacityFactors(value);
  return {
    ...(factors?.overall === undefined ? {} : { opacity: factors.overall }),
    ...(factors?.fill === undefined ? {} : { fillOpacity: factors.fill }),
    ...(factors?.stroke === undefined ? {} : { strokeOpacity: factors.stroke }),
  };
};
