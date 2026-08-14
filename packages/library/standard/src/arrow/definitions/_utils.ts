import type { ArrowEmitContext, MarkerPathPrim, MarkerPrimitive } from '@retikz/core';

/** 空心 path 的可选几何配置 */
type HollowPathOptions = {
  strokeLinejoin?: MarkerPathPrim['strokeLinejoin'];
};

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
