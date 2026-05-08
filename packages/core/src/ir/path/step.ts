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

export const FoldStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('step')
      .describe(
        'Folded right-angle segment from cursor to target through one intermediate point (TikZ `-|` / `|-`)',
      ),
    via: z
      .enum(['-|', '|-'])
      .describe(
        'Folding direction: `-|` first horizontal then vertical; `|-` first vertical then horizontal',
      ),
    to: TargetSchema.describe('Destination point of the folded segment'),
  })
  .describe(
    'Fold action: TikZ-style right-angle fold with a single intermediate point chosen by `via`',
  );

export const CycleStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('cycle')
      .describe(
        'Close the path back to the most recent move target (TikZ `cycle` / SVG path "Z")',
      ),
  })
  .describe(
    'Cycle action: close the current sub-path back to its starting point; carries no `to` field',
  );

export const StepSchema = z
  .discriminatedUnion('kind', [MoveStepSchema, LineStepSchema, FoldStepSchema, CycleStepSchema])
  .describe('A single path action; the discriminator field is `kind`');

/** Move step：移动游标但不绘制 */
export type IRMoveStep = z.infer<typeof MoveStepSchema>;

/** Line step：从游标到目标画直线 */
export type IRLineStep = z.infer<typeof LineStepSchema>;

/** Fold step：折角段，从游标到目标经一个直角中间点（TikZ `-|` / `|-`） */
export type IRFoldStep = z.infer<typeof FoldStepSchema>;

/** Cycle step：把当前子路径闭合回起点（TikZ `cycle` / SVG `Z`） */
export type IRCycleStep = z.infer<typeof CycleStepSchema>;

/**
 * 路径上的一个动作。v0.1.0-alpha.1 支持 'move' / 'line' / 'step'（折角）/ 'cycle'（闭合）。
 * 后续会加 'curve'、'cubic'、'rel' 等。
 */
export type IRStep = z.infer<typeof StepSchema>;
