import type {
  IRPlotAnnotation,
  IRPlotAnnotationPosition,
  IRPlotChannel,
  IRPlotMarkOperation,
  IRPlotPositionEncoding,
} from '../schemas';
import { isAnnotation } from '../schemas';

/** 一个显式位置的固定角色值与字段来源 */
export type AnnotationPositionSources = {
  /** 固定角色值，只有对应角色不存在编码时才生效 */
  properties: Partial<IRPlotAnnotationPosition>;
  /** 字段来源，与固定值共享角色名称 */
  encodings: Partial<IRPlotPositionEncoding>;
};

/** 枚举显式几何的对应位置来源，保持端点次序 */
export const annotationPositionsOf = (mark: IRPlotAnnotation): Array<AnnotationPositionSources> => {
  if (mark.type === 'point')
    return [{ properties: mark.properties?.position ?? {}, encodings: mark.encodings?.position ?? {} }];
  if (mark.type === 'path')
    return [
      { properties: mark.properties?.from ?? {}, encodings: mark.encodings?.from ?? {} },
      { properties: mark.properties?.to ?? {}, encodings: mark.encodings?.to ?? {} },
    ];

  return (['from', 'to'] as const).map(endpoint => ({
    properties: Object.fromEntries(
      Object.entries(mark.properties?.bounds ?? {}).flatMap(([role, bound]) =>
        bound[endpoint] === undefined ? [] : [[role, bound[endpoint]]],
      ),
    ),
    encodings: Object.fromEntries(
      Object.entries(mark.encodings?.bounds ?? {}).flatMap(([role, bound]) =>
        bound[endpoint] === undefined ? [] : [[role, bound[endpoint]]],
      ),
    ),
  }));
};

/** 枚举标注已声明的字段来源，比例尺名称和固定属性不参与依赖判断 */
export const annotationChannelsOf = (mark: IRPlotAnnotation): Array<IRPlotChannel> => {
  if (mark.encodings === undefined) return [];
  const channels: Array<IRPlotChannel> = [];
  for (const position of annotationPositionsOf(mark))
    for (const field of Object.values(position.encodings)) if (field !== undefined) channels.push(field);

  const { opacity, label } = mark.encodings;
  if (opacity !== undefined) channels.push(...Object.values(opacity));
  if (label !== undefined)
    for (const entry of Array.isArray(label) ? label : [label])
      if (entry.content !== undefined) channels.push(entry.content);

  // 位置、透明度和标签是显式声明的复合目标；其余目标由 schema 限定为基础字段绑定
  const nestedTargets = new Set(['position', 'from', 'to', 'bounds', 'opacity', 'label']);
  for (const [target, binding] of Object.entries(mark.encodings)) {
    if (!nestedTargets.has(target)) channels.push(binding as IRPlotChannel);
  }
  return channels;
};

/** 是否为不消费数据的独立标注；显式空变换链仍属于数据消费 */
export const isIndependentAnnotation = (mark: IRPlotMarkOperation): boolean =>
  isAnnotation(mark) && mark.transforms === undefined && annotationChannelsOf(mark).length === 0;
