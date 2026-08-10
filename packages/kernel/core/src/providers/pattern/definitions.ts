import type {
  MarkerPathPrim,
  MarkerPrimitive,
  PatternDefinition,
  PatternEmitContext,
  ResolvedPatternLineStyle,
} from '../../contract';
import type { BuiltinPatternName } from '../../schemas';

import { definePattern } from '../../contract';
import { PatternShape } from '../../schemas';
import { defineBuiltinProviderArray } from '../registry/index';

const DEFAULT_PATTERN_SIZE = 8;
const DEFAULT_STROKE_WIDTH = 1;

const withBackground = (
  context: PatternEmitContext,
  tileSize: number,
  motif: ReadonlyArray<MarkerPrimitive>,
): Array<MarkerPrimitive> =>
  context.background === undefined
    ? [...motif]
    : [{ type: 'rect', x: 0, y: 0, width: tileSize, height: tileSize, fill: context.background }, ...motif];

/** Pattern 基础线型上下文转为 resolved style */
const baseLineStyleOf = (context: PatternEmitContext): ResolvedPatternLineStyle => ({
  color: context.color,
  ...(context.lineWidth === undefined ? {} : { lineWidth: context.lineWidth }),
  ...(context.dashPattern === undefined ? {} : { dashPattern: context.dashPattern }),
  ...(context.dashOffset === undefined ? {} : { dashOffset: context.dashOffset }),
  ...(context.lineCap === undefined ? {} : { lineCap: context.lineCap }),
  ...(context.lineJoin === undefined ? {} : { lineJoin: context.lineJoin }),
});

/** 已解析 Pattern 线型到 marker path 描边字段的统一映射 */
const markerLineStyleOf = (
  style: ResolvedPatternLineStyle,
): Pick<
  MarkerPathPrim,
  'stroke' | 'strokeWidth' | 'dashPattern' | 'dashOffset' | 'strokeLinecap' | 'strokeLinejoin'
> => ({
  stroke: style.color,
  strokeWidth: style.lineWidth ?? DEFAULT_STROKE_WIDTH,
  ...(style.dashPattern === undefined ? {} : { dashPattern: style.dashPattern }),
  ...(style.dashOffset === undefined ? {} : { dashOffset: style.dashOffset }),
  ...(style.lineCap === undefined ? {} : { strokeLinecap: style.lineCap }),
  ...(style.lineJoin === undefined ? {} : { strokeLinejoin: style.lineJoin }),
});

/** 构建一个水平线 motif */
const horizontalLineOf = (tileSize: number, y: number, style: ResolvedPatternLineStyle): MarkerPathPrim => ({
  type: 'path',
  commands: [
    { kind: 'move', to: [0, y] },
    { kind: 'line', to: [tileSize, y] },
  ],
  ...markerLineStyleOf(style),
});

/** 横线 pattern motif：在 tile 中线位置绘制一条水平线 */
const linesPattern = definePattern({
  name: PatternShape.Lines,
  defaultSize: DEFAULT_PATTERN_SIZE,
  emit: context => {
    const styles = context.lineStyleCycle?.styles ?? [baseLineStyleOf(context)];
    const tileSize = context.round(context.size * styles.length);
    const motif = styles.map((style, index) =>
      horizontalLineOf(tileSize, context.round(context.size * (index + 0.5)), style),
    );
    const withTileBackground = withBackground(context, tileSize, motif);
    return context.lineStyleCycle === undefined
      ? withTileBackground
      : {
          tileSize,
          motif: withTileBackground,
        };
  },
});

/** 网格 pattern motif：在 tile 中线位置绘制水平线和垂直线 */
const gridPattern = definePattern({
  name: PatternShape.Grid,
  defaultSize: DEFAULT_PATTERN_SIZE,
  emit: (context): Array<MarkerPrimitive> => {
    const half = context.round(context.size / 2);
    const baseStyle = baseLineStyleOf(context);
    return withBackground(context, context.size, [
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [0, half] },
          { kind: 'line', to: [context.size, half] },
        ],
        ...markerLineStyleOf(context.horizontalStyle ?? baseStyle),
      },
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [half, 0] },
          { kind: 'line', to: [half, context.size] },
        ],
        ...markerLineStyleOf(context.verticalStyle ?? baseStyle),
      },
    ]);
  },
});

/** 圆点 pattern motif：在 tile 中心绘制一个圆点 */
const dotsPattern = definePattern({
  name: PatternShape.Dots,
  defaultSize: DEFAULT_PATTERN_SIZE,
  emit: (context): Array<MarkerPrimitive> => {
    const radius = context.round(context.lineWidth ?? context.size / 5);
    const center = context.round(context.size / 2);
    return withBackground(context, context.size, [
      { type: 'ellipse', cx: center, cy: center, rx: radius, ry: radius, fill: context.color },
    ]);
  },
});

/** 内置 pattern provider 注册项 */
export const BUILTIN_PATTERNS = defineBuiltinProviderArray<PatternDefinition, BuiltinPatternName>([
  linesPattern,
  gridPattern,
  dotsPattern,
]);
