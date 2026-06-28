import type { CompileWarning } from '../../compile/constant';
import type { PatternDefinition, PatternEmitContext } from '../../contract/pattern';
import type { MarkerPrimitive } from '../../primitive/marker';
import type { BuiltinPatternName } from '../../schemas/paint';

import { CompileWarningCode } from '../../compile/constant';

const DEFAULT_PATTERN_SIZE = 8;
const DEFAULT_STROKE_WIDTH = 1;

const withBackground = (ctx: PatternEmitContext, motif: ReadonlyArray<MarkerPrimitive>): Array<MarkerPrimitive> =>
  ctx.background === undefined
    ? [...motif]
    : [{ type: 'rect', x: 0, y: 0, width: ctx.size, height: ctx.size, fill: ctx.background }, ...motif];

export const BUILTIN_PATTERNS: Record<BuiltinPatternName, PatternDefinition> = {
  lines: {
    defaultSize: DEFAULT_PATTERN_SIZE,
    emit: (ctx): Array<MarkerPrimitive> => {
      const half = ctx.round(ctx.size / 2);
      return withBackground(ctx, [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, half] },
            { kind: 'line', to: [ctx.size, half] },
          ],
          stroke: ctx.color,
          strokeWidth: ctx.lineWidth ?? DEFAULT_STROKE_WIDTH,
        },
      ]);
    },
  },
  grid: {
    defaultSize: DEFAULT_PATTERN_SIZE,
    emit: (ctx): Array<MarkerPrimitive> => {
      const half = ctx.round(ctx.size / 2);
      return withBackground(ctx, [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, half] },
            { kind: 'line', to: [ctx.size, half] },
            { kind: 'move', to: [half, 0] },
            { kind: 'line', to: [half, ctx.size] },
          ],
          stroke: ctx.color,
          strokeWidth: ctx.lineWidth ?? DEFAULT_STROKE_WIDTH,
        },
      ]);
    },
  },
  dots: {
    defaultSize: DEFAULT_PATTERN_SIZE,
    emit: (ctx): Array<MarkerPrimitive> => {
      const radius = ctx.round(ctx.lineWidth ?? ctx.size / 5);
      const center = ctx.round(ctx.size / 2);
      return withBackground(ctx, [
        { type: 'ellipse', cx: center, cy: center, rx: radius, ry: radius, fill: ctx.color },
      ]);
    },
  },
};

export const resolvePatternRegistry = (
  patterns: Record<string, PatternDefinition> | undefined,
  onWarn: (warning: CompileWarning) => void,
): Record<string, PatternDefinition> => {
  if (!patterns) return BUILTIN_PATTERNS;
  for (const name of Object.keys(patterns)) {
    if (Object.prototype.hasOwnProperty.call(BUILTIN_PATTERNS, name)) {
      onWarn({
        code: CompileWarningCode.PatternOverridesBuiltin,
        message: `Injected pattern '${name}' overrides the built-in pattern of the same name.`,
        path: `options.patterns.${name}`,
      });
    }
  }
  return { ...BUILTIN_PATTERNS, ...patterns };
};
