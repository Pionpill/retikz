import type { ValueOf } from '@retikz/foundation';

/** Standard 提供的可选形状 provider 名称 */
export const StandardShapeName = {
  /** 任意闭合轮廓形状 */
  Contour: 'contour',
  /** 十字形状 */
  Cross: 'cross',
  /** 扇区形状 */
  Sector: 'sector',
  /** 星形 */
  Star: 'star',
  /** 梯形 */
  Trapezoid: 'trapezoid',
  /** 平行四边形 */
  Parallelogram: 'parallelogram',
  /** 长六边形 */
  Hexagon: 'hexagon',
  /** 圆柱形 */
  Cylinder: 'cylinder',
} as const;

/** Standard 形状 provider 名称取值 */
export type StandardShapeNameValue = ValueOf<typeof StandardShapeName>;
