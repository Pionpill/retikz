import type { ArrowDefinition, ArrowEmitContext } from '../../contract/arrow';
import type { MarkerPrimitive } from '../../primitive/marker';
import type { BuiltinArrowShapeValue } from '../../schemas/path/arrow';

import { defineBuiltinProviderArray, resolveProviderRegistry } from '../registry';

/** 实心闭合三角 / 菱形 / V 形的 path 工厂：填充走 ctx.fill（无 override = contextStroke） */
const filledPath = (ctx: ArrowEmitContext, points: ReadonlyArray<[number, number]>): MarkerPrimitive => ({
  type: 'path',
  commands: [
    { kind: 'move', to: points[0] },
    ...points.slice(1).map((p): { kind: 'line'; to: [number, number] } => ({ kind: 'line', to: p })),
    { kind: 'close' },
  ],
  fill: typeof ctx.fill === 'string' ? ctx.fill : { kind: 'contextStroke' },
});

/** 空心闭合 path 工厂：无 fill、描边走 ctx.stroke / ctx.lineWidth（contextStroke 由 adapter 映射） */
const hollowPath = (
  ctx: ArrowEmitContext,
  points: ReadonlyArray<[number, number]>,
  strokeLinejoin?: 'miter' | 'round' | 'bevel',
): MarkerPrimitive => ({
  type: 'path',
  commands: [
    { kind: 'move', to: points[0] },
    ...points.slice(1).map((p): { kind: 'line'; to: [number, number] } => ({ kind: 'line', to: p })),
    { kind: 'close' },
  ],
  stroke: typeof ctx.stroke === 'string' ? ctx.stroke : 'context-stroke',
  strokeWidth: ctx.lineWidth,
  ...(strokeLinejoin ? { strokeLinejoin } : {}),
});

/** 内置 8 arrow 注册项；与 `CompileOptions.arrows` 合并时被同名注入覆盖 */
export const BUILTIN_ARROWS = defineBuiltinProviderArray<ArrowDefinition, BuiltinArrowShapeValue>([
  {
    name: 'normal',
    lineContactX: 0,
    emit: ctx => [
      filledPath(ctx, [
        [0, 0],
        [10, 5],
        [0, 10],
      ]),
    ],
  },
  {
    name: 'open',
    hollow: true,
    lineContactX: 1,
    tipX: 9,
    emit: ctx => [
      hollowPath(ctx, [
        [1, 1],
        [9, 5],
        [1, 9],
      ]),
    ],
  },
  {
    name: 'stealth',
    lineContactX: 3,
    emit: ctx => [
      filledPath(ctx, [
        [0, 0],
        [10, 5],
        [0, 10],
        [3, 5],
      ]),
    ],
  },
  {
    name: 'openStealth',
    hollow: true,
    lineContactX: 3,
    tipX: 9,
    emit: ctx => [
      hollowPath(
        ctx,
        [
          [1, 1],
          [9, 5],
          [1, 9],
          [3, 5],
        ],
        'miter',
      ),
    ],
  },
  {
    name: 'diamond',
    lineContactX: 0,
    emit: ctx => [
      filledPath(ctx, [
        [0, 5],
        [5, 0],
        [10, 5],
        [5, 10],
      ]),
    ],
  },
  {
    name: 'openDiamond',
    hollow: true,
    lineContactX: 1,
    tipX: 9,
    emit: ctx => [
      hollowPath(
        ctx,
        [
          [1, 5],
          [5, 1],
          [9, 5],
          [5, 9],
        ],
        'round',
      ),
    ],
  },
  {
    name: 'circle',
    lineContactX: 0,
    emit: ctx => [
      {
        type: 'ellipse',
        cx: 5,
        cy: 5,
        rx: 5,
        ry: 5,
        fill: typeof ctx.fill === 'string' ? ctx.fill : { kind: 'contextStroke' },
      },
    ],
  },
  {
    name: 'openCircle',
    hollow: true,
    lineContactX: 0.75,
    emit: ctx => [
      {
        type: 'ellipse',
        cx: 5,
        cy: 5,
        rx: 4.25,
        ry: 4.25,
        stroke: typeof ctx.stroke === 'string' ? ctx.stroke : { kind: 'contextStroke' },
        strokeWidth: ctx.lineWidth,
      },
    ],
  },
]);

export const resolveArrowRegistry = (arrows?: ReadonlyArray<ArrowDefinition>): ReadonlyMap<string, ArrowDefinition> =>
  resolveProviderRegistry({
    capability: 'arrow',
    builtins: BUILTIN_ARROWS,
    custom: arrows,
    keyOf: definition => definition.name,
    optionName: 'arrows',
  });
