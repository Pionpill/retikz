import { NonNegativeNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import type { AnyClipShapeDefinition, RectClipShape } from '../../contract';

import { defineClipShape } from '../../contract';
import { defineKeyedProviderArray } from '../registry';

const RectClipShapeSchema: z.ZodType<RectClipShape> = z.strictObject({
  kind: z.literal('rect'),
  x: z.number(),
  y: z.number(),
  width: NonNegativeNumberSchema,
  height: NonNegativeNumberSchema,
});

/** 内置矩形 ClipShape Definition */
export const RectClipShapeDefinition = defineClipShape<RectClipShape>({
  kind: 'rect',
  schema: RectClipShapeSchema,
  lower: shape => ({
    commands: [
      { kind: 'move', to: [shape.x, shape.y] },
      { kind: 'line', to: [shape.x + shape.width, shape.y] },
      { kind: 'line', to: [shape.x + shape.width, shape.y + shape.height] },
      { kind: 'line', to: [shape.x, shape.y + shape.height] },
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  }),
});

/** Core 内置的 ClipShape provider 名称 */
export type BuiltinClipShapeProviderName = 'rect';

const keyOfBuiltinClipShape = (definition: AnyClipShapeDefinition): BuiltinClipShapeProviderName => {
  if (definition.kind === 'rect') return definition.kind;
  throw new Error(`Unknown builtin clip shape provider kind '${definition.kind}'.`);
};

/** Core 内置的矩形 ClipShape definition */
export const BUILTIN_CLIP_SHAPES = defineKeyedProviderArray<AnyClipShapeDefinition, BuiltinClipShapeProviderName>(
  [RectClipShapeDefinition],
  keyOfBuiltinClipShape,
);
