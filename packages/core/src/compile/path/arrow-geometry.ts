import {
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  HOLLOW_ARROW_SHAPES,
} from '../../ir';
import type { ArrowShape } from '../../ir';
import type { ArrowEndSpec } from '../../primitive';

/** 标准箭头局部坐标基准尺寸 */
const ARROW_GEOMETRY_BASE_SIZE = 10;

/** 箭头形状几何：供路径端点收缩计算使用 */
export type ArrowShapeGeometry = {
  /** 标准局部坐标基准尺寸 */
  baseSize: number;
  /** 箭头尖端在标准局部坐标里的 x 位置 */
  tipX: number;
  /** 路径线段应接触箭头尾部或凹口的位置 */
  lineContactX: number;
  /** 默认箭头长度 */
  defaultLength: number;
  /** 默认箭头宽度 */
  defaultWidth: number;
  /** 空心箭头默认描边宽度 */
  hollowLineWidth?: number;
};

/** 箭头形状是否为空心描边形状 */
export const isHollowArrowShape = (shape: ArrowShape): boolean =>
  HOLLOW_ARROW_SHAPES.has(shape);

/** 解析端点箭头在标准局部坐标中的中性几何 */
export const resolveArrowShapeGeometry = (spec: ArrowEndSpec): ArrowShapeGeometry => {
  const lineWidth = spec.lineWidth ?? ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH;
  const base: ArrowShapeGeometry = {
    baseSize: ARROW_GEOMETRY_BASE_SIZE,
    tipX: ARROW_GEOMETRY_BASE_SIZE,
    lineContactX: 0,
    defaultLength: ARROW_MARKER_DEFAULT_SIZE,
    defaultWidth: ARROW_MARKER_DEFAULT_SIZE,
  };

  switch (spec.shape) {
    case 'normal':
    case 'diamond':
    case 'circle':
      return base;
    case 'stealth':
      return { ...base, lineContactX: 3 };
    case 'open':
    case 'openDiamond':
      return {
        ...base,
        tipX: 9,
        lineContactX: 1 - lineWidth / 2,
        hollowLineWidth: lineWidth,
      };
    case 'openCircle':
      return {
        ...base,
        lineContactX: 0,
        hollowLineWidth: lineWidth,
      };
  }
};
