import type { MarkerPrimitive } from '../../primitive/marker';
import type { BuiltinArrowName } from '../../schemas/path/arrow';
import type { ArrowDefinition, ArrowEmitContext } from '../../contract/arrow';
import type { CompileWarning } from '../../compile/constant';
import { CompileWarningCode } from '../../compile/constant';

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

/** 内置 8 arrow 注册项；与 `CompileOptions.arrows` 合并时被同名注入覆盖 */
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
        stroke: typeof ctx.stroke === 'string' ? ctx.stroke : { kind: 'contextStroke' },
        strokeWidth: ctx.lineWidth,
      },
    ],
  },
};

export const resolveArrowRegistry = (
  arrows: Record<string, ArrowDefinition> | undefined,
  onWarn: (warning: CompileWarning) => void,
): Record<string, ArrowDefinition> => {
  if (!arrows) return BUILTIN_ARROWS;
  for (const name of Object.keys(arrows)) {
    if (Object.prototype.hasOwnProperty.call(BUILTIN_ARROWS, name)) {
      onWarn({
        code: CompileWarningCode.ArrowOverridesBuiltin,
        message: `Injected arrow '${name}' overrides the built-in arrow of the same name.`,
        path: `options.arrows.${name}`,
      });
    }
  }
  return { ...BUILTIN_ARROWS, ...arrows };
};
