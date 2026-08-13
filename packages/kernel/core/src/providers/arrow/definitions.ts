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
  lineContactX: 0,
  emit: context => [
    filledPath(context, [
      [0, 0],
      [10, 5],
      [0, 10],
    ]),
  ],
});

/** 实心 stealth 箭头：倒钩点用于让路径 shrink 到视觉内凹处 */
const stealthArrow = defineArrow({
  name: BuiltinArrowShape.Stealth,
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

/** 内置基础箭头注册项；与 `CompileOptions.arrows` 合并时复用统一注册和重复键诊断 */
export const BUILTIN_ARROWS = defineBuiltinProviderArray<ArrowDefinition, 'normal' | 'stealth'>([
  normalArrow,
  stealthArrow,
]);
