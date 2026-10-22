/** 演示采用的坐标和角度域 */
export type AnnotationCoordinate = 'cartesian' | 'polar-continuous' | 'polar-discrete';

/** 离散角度使用的分类 */
export const annotationCategories = ['A', 'B', 'C', 'D', 'E', 'F'];

/** 连续位置以 0–100 表示，极坐标中换算为角度 */
export const annotationX = (coordinate: AnnotationCoordinate, value: number, category: string) =>
  coordinate === 'polar-discrete' ? category : coordinate === 'polar-continuous' ? value * 3.6 : value;

/** 与坐标选择匹配的横向比例尺 */
export const annotationXScale = (coordinate: AnnotationCoordinate) =>
  coordinate === 'polar-discrete'
    ? { type: 'band' as const, domain: annotationCategories, paddingInner: 0, paddingOuter: 0 }
    : {
        type: 'linear' as const,
        domain: [0, coordinate === 'cartesian' ? 100 : 360] satisfies [number, number],
        domainPadding: 0,
      };
