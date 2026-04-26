import { z } from 'zod';
import { TargetSchema } from './target';

export const MoveStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('move')
      .describe('Move the cursor to the target without drawing (like SVG path "M")'),
    to: TargetSchema.describe('Destination point of the move'),
  })
  .describe('Move action: relocate the path cursor without drawing');

export const LineStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('line')
      .describe('Draw a straight line from the current cursor to the target (like SVG path "L")'),
    to: TargetSchema.describe('Destination point of the line segment'),
  })
  .describe('Line action: straight-line segment from cursor to target');

export const StepSchema = z
  .discriminatedUnion('kind', [MoveStepSchema, LineStepSchema])
  .describe('A single path action; the discriminator field is `kind`');

/** Move step：移动游标但不绘制 */
export type IRMoveStep = z.infer<typeof MoveStepSchema>;

/** Line step：从游标到目标画直线 */
export type IRLineStep = z.infer<typeof LineStepSchema>;

/**
 * 路径上的一个动作。v0.1.0-alpha 仅支持 'move' 与 'line'。
 * 后续会加 'step'（折角）、'curve'、'cubic'、'rel'、'close' 等。
 */
export type IRStep = z.infer<typeof StepSchema>;
