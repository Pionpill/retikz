import type { PatternDefinition, PatternEmitContext } from '../../contract/pattern';
import type { MarkerPrimitive } from '../../contract/scene';
import type { BuiltinPatternName } from '../../schemas/paint';

import { defineBuiltinProviderArray, resolveProviderRegistry } from '../registry';

const DEFAULT_PATTERN_SIZE = 8;
const DEFAULT_STROKE_WIDTH = 1;

const withBackground = (ctx: PatternEmitContext, motif: ReadonlyArray<MarkerPrimitive>): Array<MarkerPrimitive> =>
  ctx.background === undefined
    ? [...motif]
    : [{ type: 'rect', x: 0, y: 0, width: ctx.size, height: ctx.size, fill: ctx.background }, ...motif];

export const BUILTIN_PATTERNS = defineBuiltinProviderArray<PatternDefinition, BuiltinPatternName>([
  {
    name: 'lines',
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
  {
    name: 'grid',
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
  {
    name: 'dots',
    defaultSize: DEFAULT_PATTERN_SIZE,
    emit: (ctx): Array<MarkerPrimitive> => {
      const radius = ctx.round(ctx.lineWidth ?? ctx.size / 5);
      const center = ctx.round(ctx.size / 2);
      return withBackground(ctx, [
        { type: 'ellipse', cx: center, cy: center, rx: radius, ry: radius, fill: ctx.color },
      ]);
    },
  },
]);

export const resolvePatternRegistry = (
  patterns?: ReadonlyArray<PatternDefinition>,
): ReadonlyMap<string, PatternDefinition> =>
  resolveProviderRegistry({
    capability: 'pattern shape',
    builtins: BUILTIN_PATTERNS,
    custom: patterns,
    keyOf: definition => definition.name,
    optionName: 'patterns',
  });
