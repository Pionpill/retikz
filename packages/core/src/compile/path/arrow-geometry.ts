import {
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  HOLLOW_ARROW_SHAPES,
} from '../../ir';
import type { ArrowShape, ArrowShapeName } from '../../ir';

/**
 * 解析端点几何所需的视觉输入子集（compile-internal）
 * @description 仅 `shape`（决定中性几何）+ `lineWidth`（空心 refX 调整）；与 `shrink.ts` 的
 *   `ResolvedArrowVisual` 结构兼容。不耦合最终 `ArrowEndSpec`（后者已无 lineWidth）。
 */
type ArrowVisualInput = {
  /** 形状名（内置 7 或开放扩展名） */
  shape: ArrowShapeName;
  /** 空心 shape 描边粗细（user units）；缺省 1.5 */
  lineWidth?: number;
};

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

/** 箭头形状是否为空心描边形状（接受开放名；非内置空心名按实心处理） */
export const isHollowArrowShape = (shape: ArrowShapeName): boolean =>
  HOLLOW_ARROW_SHAPES.has(shape as ArrowShape);

/** 解析端点箭头在标准局部坐标中的中性几何 */
export const resolveArrowShapeGeometry = (spec: ArrowVisualInput): ArrowShapeGeometry => {
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
        lineContactX: 0.75 - lineWidth / 2,
        hollowLineWidth: lineWidth,
      };
    default:
      // 开放名（扩展 arrow）落默认实心几何；registry 查表 / 未注册名 throw 由编译期落
      return base;
  }
};
