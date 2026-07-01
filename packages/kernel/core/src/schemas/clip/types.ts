import type { IRJsonObject } from '../json';
import type { IRPathCommand } from '../path-command';

export type IRClipFillRule = 'nonzero' | 'evenodd';
export type IRRectClipSpec = { kind: 'rect'; x: number; y: number; width: number; height: number };
export type IRCircleClipSpec = { kind: 'circle'; cx: number; cy: number; r: number };
export type IREllipseClipSpec = { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number };
export type IRPolygonClipSpec = { kind: 'polygon'; points: Array<[number, number]> };
export type IRPathClipSpec = {
  kind: 'path';
  commands: Array<IRPathCommand>;
  fillRule?: IRClipFillRule;
};
export type IRCompoundClipSpec = {
  kind: 'compound';
  children: Array<IRClipSpec>;
  fillRule?: IRClipFillRule;
};
export type IRCustomClipSpec = IRJsonObject & { kind: string };

export type IRClipSpec =
  | IRRectClipSpec
  | IRCircleClipSpec
  | IREllipseClipSpec
  | IRPolygonClipSpec
  | IRPathClipSpec
  | IRCompoundClipSpec
  | IRCustomClipSpec;
