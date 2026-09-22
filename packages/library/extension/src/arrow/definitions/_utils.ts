import type { ArrowEmitContext, MarkerPathPrim, MarkerPrimitive } from '@retikz/core';

/** 空心 path 的可选几何配置 */
type HollowPathOptions = {
  strokeLinejoin?: MarkerPathPrim['strokeLinejoin'];
};

/** 一条开放 marker 子路径 */
export type OpenMarkerSubpath = Readonly<{
  from: [number, number];
  to: [number, number];
}>;

/** 创建实心闭合标记路径 */
export const filledPath = (context: ArrowEmitContext, points: ReadonlyArray<[number, number]>): MarkerPrimitive => ({
  type: 'path',
  commands: [
    { kind: 'move', to: points[0] },
    ...points.slice(1).map((point): { kind: 'line'; to: [number, number] } => ({ kind: 'line', to: point })),
    { kind: 'close' },
  ],
  fill: typeof context.fill === 'string' ? context.fill : { kind: 'contextStroke' },
});

/** 创建空心闭合标记路径 */
export const hollowPath = (
  context: ArrowEmitContext,
  points: ReadonlyArray<[number, number]>,
  options: HollowPathOptions = {},
): MarkerPrimitive => ({
  type: 'path',
  commands: [
    { kind: 'move', to: points[0] },
    ...points.slice(1).map((point): { kind: 'line'; to: [number, number] } => ({ kind: 'line', to: point })),
    { kind: 'close' },
  ],
  stroke: typeof context.stroke === 'string' ? context.stroke : { kind: 'contextStroke' },
  strokeWidth: context.lineWidth,
  ...(options.strokeLinejoin === undefined ? {} : { strokeLinejoin: options.strokeLinejoin }),
});

/** 创建由一条或多条开放线段组成的描边标记路径 */
export const openStrokePath = (
  context: ArrowEmitContext,
  subpaths: ReadonlyArray<OpenMarkerSubpath>,
): MarkerPrimitive => ({
  type: 'path',
  commands: subpaths.flatMap(({ from, to }) => [
    { kind: 'move' as const, to: from },
    { kind: 'line' as const, to },
  ]),
  stroke: typeof context.stroke === 'string' ? context.stroke : { kind: 'contextStroke' },
  strokeWidth: context.lineWidth,
});
