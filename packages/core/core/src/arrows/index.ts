/**
 * Arrow Registry 扩展面
 * @description 内置 8 arrow 的注册项 + 第三方 arrow 作者所需的类型。
 *   `BUILTIN_ARROWS` 的 Record key 用 `BuiltinArrowName`（8 名穷尽），不用开放的 `ArrowShapeName`。
 *
 *   内置 8 的 `emit` 在局部 baseSize=10 坐标系产 `MarkerPrimitive` 几何（renderer-agnostic）；
 *   几何字段（baseSize / lineContactX / tipX / defaultLength / defaultWidth / hollow）按几何契约声明。
 */
import type { MarkerPrimitive } from '../primitive/marker';
import type { BuiltinArrowName } from '../ir/path/arrow';
import type { ArrowDefinition, ArrowEmitContext } from './types';

/** 实心闭合三角 / 菱形 / V 形的 path 工厂：填充走 ctx.fill（无 override = contextStroke） */
const filledPath = (
  ctx: ArrowEmitContext,
  points: ReadonlyArray<[number, number]>,
): MarkerPrimitive => ({
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

/**
 * 内置 8 arrow 注册项；与 `CompileOptions.arrows` 合并时被同名注入覆盖
 * @description 几何字段（lineContactX 静态 base / tipX / hollow）：
 *   实心 normal/diamond/circle lineContactX=0；stealth=3；open/openDiamond base=1 + tipX=9 + hollow；
 *   openStealth base=3 + tipX=9 + hollow；
 *   openCircle base=0.75 + hollow。baseSize / defaultLength / defaultWidth 走类型缺省（10 / 6 / 6）。
 *   framework 对 hollow def 统一把 lineContactX 减 lineWidth/2 得实际 refX / shrink 接触点。
 *   emit 几何在局部 baseSize=10 坐标系（renderer-agnostic）。
 */
export const BUILTIN_ARROWS: Record<BuiltinArrowName, ArrowDefinition> = {
  normal: {
    lineContactX: 0,
    emit: ctx => [filledPath(ctx, [[0, 0], [10, 5], [0, 10]])],
  },
  open: {
    hollow: true,
    lineContactX: 1,
    tipX: 9,
    emit: ctx => [hollowPath(ctx, [[1, 1], [9, 5], [1, 9]])],
  },
  stealth: {
    lineContactX: 3,
    emit: ctx => [filledPath(ctx, [[0, 0], [10, 5], [0, 10], [3, 5]])],
  },
  openStealth: {
    hollow: true,
    lineContactX: 3,
    tipX: 9,
    emit: ctx => [hollowPath(ctx, [[1, 1], [9, 5], [1, 9], [3, 5]], 'miter')],
  },
  diamond: {
    lineContactX: 0,
    emit: ctx => [filledPath(ctx, [[0, 5], [5, 0], [10, 5], [5, 10]])],
  },
  openDiamond: {
    hollow: true,
    lineContactX: 1,
    tipX: 9,
    emit: ctx => [hollowPath(ctx, [[1, 5], [5, 1], [9, 5], [5, 9]], 'round')],
  },
  circle: {
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
  openCircle: {
    hollow: true,
    lineContactX: 0.75,
    emit: ctx => [
      {
        type: 'ellipse',
        cx: 5,
        cy: 5,
        rx: 4.25,
        ry: 4.25,
        stroke: typeof ctx.stroke === 'string' ? ctx.stroke : 'context-stroke',
        strokeWidth: ctx.lineWidth,
      },
    ],
  },
};

export type { ArrowDefinition, ArrowEmitContext } from './types';
export { defineArrow } from './define';
