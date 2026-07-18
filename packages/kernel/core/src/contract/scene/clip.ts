import type { IRClipFillRule, IRPosition } from '../../schemas';
import type { PathCommand } from './path';

/** 用户坐标系中的矩形 Scene 裁剪形状 */
export type RectClipShape = {
  /** 形状判别符 */
  kind: 'rect';
  /** 矩形左上角横坐标 */
  x: number;
  /** 矩形左上角纵坐标 */
  y: number;
  /** 矩形宽度 */
  width: number;
  /** 矩形高度 */
  height: number;
};

/** 用户坐标系中的圆形 Scene 裁剪形状 */
export type CircleClipShape = {
  /** 形状判别符 */
  kind: 'circle';
  /** 圆心横坐标 */
  cx: number;
  /** 圆心纵坐标 */
  cy: number;
  /** 圆半径 */
  r: number;
};

/** 用户坐标系中的椭圆 Scene 裁剪形状 */
export type EllipseClipShape = {
  /** 形状判别符 */
  kind: 'ellipse';
  /** 椭圆圆心横坐标 */
  cx: number;
  /** 椭圆圆心纵坐标 */
  cy: number;
  /** x 轴半径 */
  rx: number;
  /** y 轴半径 */
  ry: number;
};

/** 用户坐标系中的多边形 Scene 裁剪形状 */
export type PolygonClipShape = {
  /** 形状判别符 */
  kind: 'polygon';
  /** 多边形顶点序列 */
  points: Array<IRPosition>;
};

/** 使用结构化路径命令描述的 Scene 裁剪形状 */
export type PathClipShape = {
  /** 形状判别符 */
  kind: 'path';
  /** 裁剪路径命令序列 */
  commands: Array<PathCommand>;
  /**
   * 裁剪路径填充规则
   * @default 'nonzero'
   */
  fillRule?: IRClipFillRule;
};

/** 由嵌套裁剪形状组合而成的复合 Scene 裁剪形状 */
export type CompoundClipShape = {
  /** 形状判别符 */
  kind: 'compound';
  /** 参与组合的子裁剪形状 */
  children: Array<ClipShape>;
  /**
   * 复合裁剪形状填充规则
   * @default 'nonzero'
   */
  fillRule?: IRClipFillRule;
};

/** renderer adapter 消费的 Scene 裁剪形状联合类型 */
export type ClipShape =
  | RectClipShape
  | CircleClipShape
  | EllipseClipShape
  | PolygonClipShape
  | PathClipShape
  | CompoundClipShape;

/** 可被 primitive 或 group 引用的具名 Scene 裁剪资源 */
export type ClipResource = {
  kind: 'clip';
  id: string;
  shape: ClipShape;
};
