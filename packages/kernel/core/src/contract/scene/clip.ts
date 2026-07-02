import type { PathCommand } from './path';

/** Rectangular Scene clip shape in user coordinates. */
export type RectClipShape = { kind: 'rect'; x: number; y: number; width: number; height: number };

/** Circular Scene clip shape in user coordinates. */
export type CircleClipShape = { kind: 'circle'; cx: number; cy: number; r: number };

/** Elliptical Scene clip shape in user coordinates. */
export type EllipseClipShape = { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number };

/** Polygonal Scene clip shape in user coordinates. */
export type PolygonClipShape = { kind: 'polygon'; points: Array<[number, number]> };

/** Path-based Scene clip shape using structured path commands. */
export type PathClipShape = {
  kind: 'path';
  commands: Array<PathCommand>;
  /**
   * 裁剪路径填充规则。
   * @default 'nonzero'
   */
  fillRule?: 'nonzero' | 'evenodd';
};

/** Compound Scene clip shape made of nested clip shapes. */
export type CompoundClipShape = {
  kind: 'compound';
  children: Array<ClipShape>;
  /**
   * 复合裁剪形状填充规则。
   * @default 'nonzero'
   */
  fillRule?: 'nonzero' | 'evenodd';
};

/** Scene clip shape union consumed by render adapters. */
export type ClipShape =
  | RectClipShape
  | CircleClipShape
  | EllipseClipShape
  | PolygonClipShape
  | PathClipShape
  | CompoundClipShape;

/** Named Scene clip resource referenced by primitives or groups. */
export type ClipResource = {
  kind: 'clip';
  id: string;
  shape: ClipShape;
};
