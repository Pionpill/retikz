import type { ArrowDefinition, ArrowEmitContext, MarkerPathPrim, MarkerPrimitive } from '../../contract';
import type { BuiltinArrowShapeValue } from '../../schemas';

import { defineArrow } from '../../contract';
import { BuiltinArrowShape } from '../../schemas';
import { defineBuiltinProviderArray } from '../registry';

/** 空心 path 的可选几何配置，后续扩展描边端点或连接策略时集中放在这里。 */
type HollowPathOptions = {
  /** path 闭合点的描边连接方式。 */
  strokeLinejoin?: MarkerPathPrim['strokeLinejoin'];
};

/** 实心闭合三角 / 菱形 / V 形的 path 工厂：填充走 context.fill（无 override = contextStroke）。 */
const filledPath = (context: ArrowEmitContext, points: ReadonlyArray<[number, number]>): MarkerPrimitive => ({
  type: 'path',
  commands: [
    { kind: 'move', to: points[0] },
    ...points.slice(1).map((p): { kind: 'line'; to: [number, number] } => ({ kind: 'line', to: p })),
    { kind: 'close' },
  ],
  fill: typeof context.fill === 'string' ? context.fill : { kind: 'contextStroke' },
});

/** 空心闭合 path 工厂：无 fill、描边走 context.stroke / context.lineWidth（contextStroke 由 adapter 映射）。 */
const hollowPath = (
  context: ArrowEmitContext,
  points: ReadonlyArray<[number, number]>,
  options: HollowPathOptions = {},
): MarkerPrimitive => ({
  type: 'path',
  commands: [
    { kind: 'move', to: points[0] },
    ...points.slice(1).map((p): { kind: 'line'; to: [number, number] } => ({ kind: 'line', to: p })),
    { kind: 'close' },
  ],
  stroke: typeof context.stroke === 'string' ? context.stroke : { kind: 'contextStroke' },
  strokeWidth: context.lineWidth,
  ...(options.strokeLinejoin ? { strokeLinejoin: options.strokeLinejoin } : {}),
});

/** 实心三角箭头：基础线接触点在 marker 左边界。 */
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

/** 空心三角箭头：线接触点和尖端都略向内收，避免描边外溢。 */
const openArrow = defineArrow({
  name: BuiltinArrowShape.Open,
  hollow: true,
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

/** 实心 stealth 箭头：倒钩点用于让路径 shrink 到视觉内凹处。 */
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

/** 空心 stealth 箭头：保留 miter 连接以突出尖锐倒钩。 */
const openStealthArrow = defineArrow({
  name: BuiltinArrowShape.OpenStealth,
  hollow: true,
  lineContactX: 3,
  tipX: 9,
  emit: context => [
    hollowPath(
      context,
      [
        [1, 1],
        [9, 5],
        [1, 9],
        [3, 5],
      ],
      { strokeLinejoin: 'miter' },
    ),
  ],
});

/** 实心菱形箭头：用于组合关系，线接触点在菱形左端。 */
const diamondArrow = defineArrow({
  name: BuiltinArrowShape.Diamond,
  lineContactX: 0,
  emit: context => [
    filledPath(context, [
      [0, 5],
      [5, 0],
      [10, 5],
      [5, 10],
    ]),
  ],
});

/** 空心菱形箭头：用于聚合关系，圆角连接降低描边尖角外溢。 */
const openDiamondArrow = defineArrow({
  name: BuiltinArrowShape.OpenDiamond,
  hollow: true,
  lineContactX: 1,
  tipX: 9,
  emit: context => [
    hollowPath(
      context,
      [
        [1, 5],
        [5, 1],
        [9, 5],
        [5, 9],
      ],
      { strokeLinejoin: 'round' },
    ),
  ],
});

/** 实心圆点箭头：圆心固定在 marker 中心，左边界作为线接触点。 */
const circleArrow = defineArrow({
  name: BuiltinArrowShape.Circle,
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

/** 空心圆点箭头：半径内收以给描边留出外轮廓空间。 */
const openCircleArrow = defineArrow({
  name: BuiltinArrowShape.OpenCircle,
  hollow: true,
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

/** 内置 8 arrow 注册项；与 `CompileOptions.arrows` 合并时复用统一注册和重复 key 诊断。 */
export const BUILTIN_ARROWS = defineBuiltinProviderArray<ArrowDefinition, BuiltinArrowShapeValue>([
  normalArrow,
  openArrow,
  stealthArrow,
  openStealthArrow,
  diamondArrow,
  openDiamondArrow,
  circleArrow,
  openCircleArrow,
]);
