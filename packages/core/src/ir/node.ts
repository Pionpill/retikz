import { z } from 'zod';
import { PolarPositionSchema, PositionSchema } from './position';

export const NodeSchema = z
  .object({
    type: z
      .literal('node')
      .describe('Discriminator marking this child as a node'),
    id: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional unique id; required if any path needs to reference this node by string',
      ),
    position: z
      .union([PositionSchema, PolarPositionSchema])
      .describe(
        'Center point of the node content box; Cartesian [x, y] or polar (resolved at compile time)',
      ),
    rotate: z
      .number()
      .optional()
      .describe(
        'Rotation in degrees around the node center; positive = clockwise (matches TikZ rotate=...)',
      ),
    text: z
      .string()
      .optional()
      .describe('Text label rendered inside the node; omit for an empty node'),
    fill: z
      .string()
      .optional()
      .describe(
        'Background color of the node rectangle; any CSS color (e.g. "lightblue", "#fafafa", "rgba(...)")',
      ),
    stroke: z
      .string()
      .optional()
      .describe(
        'Border color of the node rectangle; any CSS color. Defaults to currentColor when omitted',
      ),
    strokeWidth: z
      .number()
      .optional()
      .describe('Border width in user units; defaults to 1 when omitted'),
    padding: z
      .number()
      .optional()
      .describe(
        'Inner padding in user units between the text content and the node border',
      ),
    margin: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Outer margin in user units: distance between the visual border and where paths attach. Lines stop this far from the border. Defaults to 0.',
      ),
    fontSize: z
      .number()
      .optional()
      .describe(
        'Text font size in user units; defaults to a fixed size for now (TikZ font sizes will be supported later)',
      ),
  })
  .describe(
    'Rectangle node with optional text label; the basic positional drawing primitive',
  );

/** 节点：矩形 + 可选文本标签，是最基础的有定位图元 */
export type IRNode = z.infer<typeof NodeSchema>;
