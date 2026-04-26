import { z } from 'zod';
import { TargetSchema } from './target';

export const StepSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        type: z.literal('step').describe('Discriminator marking this as a path step node'),
        kind: z
          .literal('move')
          .describe('Move the cursor to the target without drawing (like SVG path "M")'),
        to: TargetSchema.describe('Destination point of the move'),
      })
      .describe('Move action: relocate the path cursor without drawing'),
    z
      .object({
        type: z.literal('step').describe('Discriminator marking this as a path step node'),
        kind: z
          .literal('line')
          .describe('Draw a straight line from the current cursor to the target (like SVG path "L")'),
        to: TargetSchema.describe('Destination point of the line segment'),
      })
      .describe('Line action: straight-line segment from cursor to target'),
  ])
  .describe('A single path action; the discriminator field is `kind`');

/**
 * 路径上的一个动作。v0.1.0-alpha 仅支持 'move' 与 'line'。
 * 后续会加 'step'（折角）、'curve'、'cubic'、'rel'、'close' 等。
 */
export type IRStep = z.infer<typeof StepSchema>;
