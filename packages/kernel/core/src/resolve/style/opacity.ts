import { mergeDefinedProperties } from '@retikz/foundation';

import type { IRGraphicStyle } from '../../schemas';
import type { GraphicOpacityResolution } from './types';

/** 将数值不透明度展开为 overall 字段，供逐字段合并 */
const opacityFactors = (value: IRGraphicStyle['opacity']) => (typeof value === 'number' ? { overall: value } : value);

/**
 * 按参数顺序合并图形样式，后面的非 undefined 字段优先
 * @description opacity 的 overall、fill、stroke 分别继承；数值简写只覆盖 overall
 * @template T 参与合并的图形样式类型，结果保留该类型的可选字段
 */
export const mergeGraphicStyle = <T extends IRGraphicStyle>(...styles: Array<T | undefined>): Partial<T> => {
  const merged = mergeDefinedProperties<T>(styles);
  const factors = mergeDefinedProperties(styles.map(style => opacityFactors(style?.opacity)));
  if (Object.keys(factors).length > 0) merged.opacity = factors;
  return merged;
};

/** 将合并后的不透明度拆为整体、填充与描边三个独立字段，缺省项保持省略 */
export const resolveGraphicOpacity = (value: IRGraphicStyle['opacity']): GraphicOpacityResolution => {
  const factors = opacityFactors(value);
  return {
    ...(factors?.overall === undefined ? {} : { opacity: factors.overall }),
    ...(factors?.fill === undefined ? {} : { fillOpacity: factors.fill }),
    ...(factors?.stroke === undefined ? {} : { strokeOpacity: factors.stroke }),
  };
};
