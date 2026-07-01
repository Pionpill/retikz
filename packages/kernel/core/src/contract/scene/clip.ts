import type { PathCommand } from './path';

export type RectClipShape = { kind: 'rect'; x: number; y: number; width: number; height: number };
export type CircleClipShape = { kind: 'circle'; cx: number; cy: number; r: number };
export type EllipseClipShape = { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number };
export type PolygonClipShape = { kind: 'polygon'; points: Array<[number, number]> };
export type PathClipShape = {
  kind: 'path';
  commands: Array<PathCommand>;
  /**
   * 裁剪路径填充规则。
   * @default 'nonzero'
   */
  fillRule?: 'nonzero' | 'evenodd';
};
export type CompoundClipShape = {
  kind: 'compound';
  children: Array<ClipShape>;
  /**
   * 复合裁剪形状填充规则。
   * @default 'nonzero'
   */
  fillRule?: 'nonzero' | 'evenodd';
};

export type ClipShape =
  | RectClipShape
  | CircleClipShape
  | EllipseClipShape
  | PolygonClipShape
  | PathClipShape
  | CompoundClipShape;

export type ClipResource = {
  kind: 'clip';
  id: string;
  shape: ClipShape;
};
