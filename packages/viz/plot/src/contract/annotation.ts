import type { IRPlotAnnotation, IRPlotAnnotationPosition, IRPlotMarkOperation } from '../schemas';
import { isAnnotation } from '../schemas';

/** 枚举显式几何的位置映射，供字段收集与数据依赖判断共用 */
export const annotationPositionsOf = (mark: IRPlotAnnotation): Array<IRPlotAnnotationPosition> => {
  if (mark.type === 'point') return [mark.position];
  if (mark.type === 'path') return [mark.from, mark.to];
  return [
    Object.fromEntries(Object.entries(mark.bounds).map(([role, bound]) => [role, bound.from])),
    Object.fromEntries(Object.entries(mark.bounds).map(([role, bound]) => [role, bound.to])),
  ];
};

/** 是否为不消费数据的独立标注；显式空变换链仍属于数据消费 */
export const isIndependentAnnotation = (mark: IRPlotMarkOperation): boolean =>
  isAnnotation(mark) &&
  mark.transform === undefined &&
  !annotationPositionsOf(mark).some(position =>
    Object.values(position).some(value => typeof value === 'object' && 'field' in value),
  );
