import type { ArrowDefinition, ArrowEmitContext, MarkerPrimitive } from '../../contract';

import { defineArrow } from '../../contract';
import { BuiltinArrowShape } from '../../schemas';
import { defineBuiltinProviderArray } from '../registry/index';

/** 实心闭合三角 / V 形的 path 工厂：填充走 context.fill（无 override = contextStroke） */
const filledPath = (context: ArrowEmitContext, points: ReadonlyArray<[number, number]>): MarkerPrimitive => ({
  type: 'path',
  commands: [
    { kind: 'move', to: points[0] },
    ...points.slice(1).map((p): { kind: 'line'; to: [number, number] } => ({ kind: 'line', to: p })),
    { kind: 'close' },
  ],
  fill: typeof context.fill === 'string' ? context.fill : { kind: 'contextStroke' },
});

/** 实心三角箭头：基础线接触点在 marker 左边界 */
const normalArrow = defineArrow({
  name: BuiltinArrowShape.Normal,
  backX: 0,
  lineContactX: 0,
  emit: context => [
    filledPath(context, [
      [0, 0],
      [10, 5],
      [0, 10],
    ]),
  ],
});

/** Core 内置空心三角箭头，描边继承当前路径的颜色与宽度 */
const openArrow = defineArrow({
  name: BuiltinArrowShape.Open,
  hollow: true,
  backX: 1,
  lineContactX: 1,
  tipX: 9,
  emit: context => [
    hollowPath(context, [
      [1, 1],
      [9, 5],
      [1, 9],
    ]),
  ],
});

/** 实心 stealth 箭头：倒钩点用于让路径 shrink 到视觉内凹处 */
const stealthArrow = defineArrow({
  name: BuiltinArrowShape.Stealth,
  backX: 0,
  lineContactX: 3,
  emit: context => [
    filledPath(context, [
      [0, 0],
      [10, 5],
      [0, 10],
      [3, 5],
    ]),
  ],
});

/** 构造空心箭头轮廓，描边继承当前路径的颜色与宽度 */
const hollowPath = (context: ArrowEmitContext, points: ReadonlyArray<[number, number]>): MarkerPrimitive => ({
  type: 'path',
  commands: [
    { kind: 'move', to: points[0] },
    ...points.slice(1).map((p): { kind: 'line'; to: [number, number] } => ({ kind: 'line', to: p })),
    { kind: 'close' },
  ],
  stroke: typeof context.stroke === 'string' ? context.stroke : { kind: 'contextStroke' },
  strokeWidth: context.lineWidth,
  strokeLinejoin: 'miter',
});

/** Core 内置空心 stealth 箭头，保留实心 stealth 的倒钩轮廓 */
const openStealthArrow = defineArrow({
  name: BuiltinArrowShape.OpenStealth,
  hollow: true,
  backX: 1,
  lineContactX: 3,
  tipX: 9,
  emit: context => [
    hollowPath(context, [
      [1, 1],
      [9, 5],
      [1, 9],
      [3, 5],
    ]),
  ],
});

/** Core 内置实心圆点箭头 */
const circleArrow = defineArrow({
  name: BuiltinArrowShape.Circle,
  backX: 0,
  lineContactX: 0,
  emit: context => [
    {
      type: 'ellipse',
      cx: 5,
      cy: 5,
      rx: 5,
      ry: 5,
      fill: typeof context.fill === 'string' ? context.fill : { kind: 'contextStroke' },
    },
  ],
});

/** Core 内置空心圆点箭头，描边继承当前路径颜色与宽度 */
const openCircleArrow = defineArrow({
  name: BuiltinArrowShape.OpenCircle,
  hollow: true,
  backX: 0.75,
  lineContactX: 0.75,
  emit: context => [
    {
      type: 'ellipse',
      cx: 5,
      cy: 5,
      rx: 4.25,
      ry: 4.25,
      stroke: typeof context.stroke === 'string' ? context.stroke : { kind: 'contextStroke' },
      strokeWidth: context.lineWidth,
    },
  ],
});

/** 内置基础箭头注册项；与 `CompileOptions.arrows` 合并时复用统一注册和重复键诊断 */
export const BUILTIN_ARROWS = defineBuiltinProviderArray<
  ArrowDefinition,
  'normal' | 'open' | 'stealth' | 'openStealth' | 'circle' | 'openCircle'
>([normalArrow, openArrow, stealthArrow, openStealthArrow, circleArrow, openCircleArrow]);
