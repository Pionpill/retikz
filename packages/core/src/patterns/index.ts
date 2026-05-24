/**
 * Pattern Registry 扩展面
 * @description 内置 3 pattern motif 的注册项 + 第三方 pattern motif 作者所需的类型。
 *   `BUILTIN_PATTERNS` 的 Record key 用 `BuiltinPatternName`（3 名穷尽），不用开放的 `PatternShapeName`。
 *
 *   内置 3 的 `emit` 在局部 tile 坐标系产 `MarkerPrimitive` 几何（lines 横线 / grid 横竖 / dots 圆点），
 *   与历史 SVG 等价；`defaultSize` 等几何字段按几何契约声明。
 */
import type { BuiltinPatternName } from '../ir/paint';
import type { MarkerPrimitive } from '../primitive/marker';
import type { PatternDefinition, PatternEmitContext } from './types';

/** 内置 3 motif 默认 tile 周期（user units）；用户 `pattern.size` 覆盖 */
const DEFAULT_PATTERN_SIZE = 8;

/** lines / grid 描边粗细缺省（用户未给 `pattern.lineWidth` 时） */
const DEFAULT_STROKE_WIDTH = 1;

/**
 * 在 motif 序列首位拼可选背景 rect（局部 tile 坐标系铺满整 tile）
 * @description `ctx.background` 给定时，等价历史 `<rect width=size height=size fill=background>` 铺底；
 *   未给则透明（不产 rect）。
 */
const withBackground = (
  ctx: PatternEmitContext,
  motif: ReadonlyArray<MarkerPrimitive>,
): Array<MarkerPrimitive> =>
  ctx.background === undefined
    ? [...motif]
    : [
        { type: 'rect', x: 0, y: 0, width: ctx.size, height: ctx.size, fill: ctx.background },
        ...motif,
      ];

/**
 * 内置 3 pattern 注册项；与 `CompileOptions.patterns` 合并时被同名注入覆盖
 * @description `defaultSize` 统一 8（user units）；motif 几何（lines 横线 / grid 横竖 / dots 圆点）
 *   在局部 tile 坐标系产出，等价历史 SVG。`ctx.background` 给定时各 motif 首位铺一张满 tile 背景 rect。
 */
export const BUILTIN_PATTERNS: Record<BuiltinPatternName, PatternDefinition> = {
  lines: {
    defaultSize: DEFAULT_PATTERN_SIZE,
    emit: (ctx): Array<MarkerPrimitive> =>
      withBackground(ctx, [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [ctx.size, 0] },
          ],
          stroke: ctx.color,
          strokeWidth: ctx.lineWidth ?? DEFAULT_STROKE_WIDTH,
        },
      ]),
  },
  grid: {
    defaultSize: DEFAULT_PATTERN_SIZE,
    emit: (ctx): Array<MarkerPrimitive> =>
      withBackground(ctx, [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [ctx.size, 0] },
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [0, ctx.size] },
          ],
          stroke: ctx.color,
          strokeWidth: ctx.lineWidth ?? DEFAULT_STROKE_WIDTH,
        },
      ]),
  },
  dots: {
    defaultSize: DEFAULT_PATTERN_SIZE,
    emit: (ctx): Array<MarkerPrimitive> => {
      // dots 半径：用户给 lineWidth 时用它，否则缺省 size/5（历史 golden）
      const radius = ctx.round(ctx.lineWidth ?? ctx.size / 5);
      const center = ctx.round(ctx.size / 2);
      return withBackground(ctx, [
        { type: 'ellipse', cx: center, cy: center, rx: radius, ry: radius, fill: ctx.color },
      ]);
    },
  },
};

export type { PatternDefinition, PatternEmitContext } from './types';
