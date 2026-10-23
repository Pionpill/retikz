import type { ArrowEmitContext, PathPrim, ScenePrimitive } from '@retikz/core';

/** 空心 path 的可选几何配置 */
type HollowPathOptions = {
  strokeLinejoin?: PathPrim['strokeLinejoin'];
};

/** 一条开放 marker 子路径 */
export type OpenMarkerSubpath = Readonly<{
  /** 开放标记子路径的起点 */
  from: [number, number];
  /** 开放标记子路径的终点 */
  to: [number, number];
}>;

/** 创建实心闭合标记路径 */
export const filledPath = (context: ArrowEmitContext, points: ReadonlyArray<[number, number]>): ScenePrimitive => ({
  type: 'path',
  commands: [
    { kind: 'move', to: points[0] },
    ...points.slice(1).map((point): { kind: 'line'; to: [number, number] } => ({ kind: 'line', to: point })),
    { kind: 'close' },
  ],
  fill: context.fill,
});

/** 创建空心闭合标记路径 */
export const hollowPath = (
  context: ArrowEmitContext,
  points: ReadonlyArray<[number, number]>,
  options: HollowPathOptions = {},
): ScenePrimitive => ({
  type: 'path',
  commands: [
    { kind: 'move', to: points[0] },
    ...points.slice(1).map((point): { kind: 'line'; to: [number, number] } => ({ kind: 'line', to: point })),
    { kind: 'close' },
  ],
  fill: 'none',
  stroke: context.stroke,
  strokeWidth: context.lineWidth,
  ...(options.strokeLinejoin === undefined ? {} : { strokeLinejoin: options.strokeLinejoin }),
});

/** 创建由一条或多条开放线段组成的描边标记路径 */
export const openStrokePath = (
  context: ArrowEmitContext,
  subpaths: ReadonlyArray<OpenMarkerSubpath>,
): ScenePrimitive => ({
  type: 'path',
  commands: subpaths.flatMap(({ from, to }) => [
    { kind: 'move' as const, to: from },
    { kind: 'line' as const, to },
  ]),
  fill: 'none',
  stroke: context.stroke,
  strokeWidth: context.lineWidth,
});
