import type { PathCommand } from './path';

/** 用户坐标系中的矩形 Scene 裁剪形状。 */
export type RectClipShape = { kind: 'rect'; x: number; y: number; width: number; height: number };

/** 用户坐标系中的圆形 Scene 裁剪形状。 */
export type CircleClipShape = { kind: 'circle'; cx: number; cy: number; r: number };

/** 用户坐标系中的椭圆 Scene 裁剪形状。 */
export type EllipseClipShape = { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number };

/** 用户坐标系中的多边形 Scene 裁剪形状。 */
export type PolygonClipShape = { kind: 'polygon'; points: Array<[number, number]> };

/** 使用结构化路径命令描述的 Scene 裁剪形状。 */
export type PathClipShape = {
  kind: 'path';
  commands: Array<PathCommand>;
  /**
   * 裁剪路径填充规则。
   * @default 'nonzero'
   */
  fillRule?: 'nonzero' | 'evenodd';
};

/** 由嵌套裁剪形状组合而成的复合 Scene 裁剪形状。 */
export type CompoundClipShape = {
  kind: 'compound';
  children: Array<ClipShape>;
  /**
   * 复合裁剪形状填充规则。
   * @default 'nonzero'
   */
  fillRule?: 'nonzero' | 'evenodd';
};

/** renderer adapter 消费的 Scene 裁剪形状联合类型。 */
export type ClipShape =
  | RectClipShape
  | CircleClipShape
  | EllipseClipShape
  | PolygonClipShape
  | PathClipShape
  | CompoundClipShape;

/** 可被 primitive 或 group 引用的具名 Scene 裁剪资源。 */
export type ClipResource = {
  kind: 'clip';
  id: string;
  shape: ClipShape;
};
