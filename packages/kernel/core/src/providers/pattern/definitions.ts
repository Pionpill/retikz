import type {
  MarkerPrimitive,
  PatternDefinition,
  PatternEmitContext,
} from '../../contract';
import type { BuiltinPatternName } from '../../schemas';

import { definePattern } from '../../contract';
import { PatternShape } from '../../schemas';
import { defineBuiltinProviderArray } from '../registry';

const DEFAULT_PATTERN_SIZE = 8;
const DEFAULT_STROKE_WIDTH = 1;

const withBackground = (
  context: PatternEmitContext,
  motif: ReadonlyArray<MarkerPrimitive>,
): Array<MarkerPrimitive> =>
  context.background === undefined
    ? [...motif]
    : [{ type: 'rect', x: 0, y: 0, width: context.size, height: context.size, fill: context.background }, ...motif];

/** 横线 pattern motif：在 tile 中线位置绘制一条水平线。 */
const linesPattern = definePattern({
  name: PatternShape.Lines,
  defaultSize: DEFAULT_PATTERN_SIZE,
  emit: (context): Array<MarkerPrimitive> => {
    const half = context.round(context.size / 2);
    return withBackground(context, [
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [0, half] },
          { kind: 'line', to: [context.size, half] },
        ],
        stroke: context.color,
        strokeWidth: context.lineWidth ?? DEFAULT_STROKE_WIDTH,
      },
    ]);
  },
});

/** 网格 pattern motif：在 tile 中线位置绘制水平线和垂直线。 */
const gridPattern = definePattern({
  name: PatternShape.Grid,
  defaultSize: DEFAULT_PATTERN_SIZE,
  emit: (context): Array<MarkerPrimitive> => {
    const half = context.round(context.size / 2);
    return withBackground(context, [
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [0, half] },
          { kind: 'line', to: [context.size, half] },
          { kind: 'move', to: [half, 0] },
          { kind: 'line', to: [half, context.size] },
        ],
        stroke: context.color,
        strokeWidth: context.lineWidth ?? DEFAULT_STROKE_WIDTH,
      },
    ]);
  },
});

/** 圆点 pattern motif：在 tile 中心绘制一个圆点。 */
const dotsPattern = definePattern({
  name: PatternShape.Dots,
  defaultSize: DEFAULT_PATTERN_SIZE,
  emit: (context): Array<MarkerPrimitive> => {
    const radius = context.round(context.lineWidth ?? context.size / 5);
    const center = context.round(context.size / 2);
    return withBackground(context, [
      { type: 'ellipse', cx: center, cy: center, rx: radius, ry: radius, fill: context.color },
    ]);
  },
});

/** 内置 pattern provider 注册项。 */
export const BUILTIN_PATTERNS = defineBuiltinProviderArray<PatternDefinition, BuiltinPatternName>([
  linesPattern,
  gridPattern,
  dotsPattern,
]);
