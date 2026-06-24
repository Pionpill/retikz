import { z } from 'zod';
import { PolarPositionSchema } from './polar-position';
import { PositionSchema } from './position';

export const OffsetPositionSchema = z
  .object({
    of: z
      .union([z.string().min(1), PositionSchema, PolarPositionSchema])
      .describe(
        'Reference base point: node id string (forward references rejected), Cartesian [x, y] literal (no pre-definition needed), or PolarPosition (recursive polar chain via its own origin). Mirrors PolarPosition.origin union shape.',
      ),
    offset: z
      .tuple([z.number().finite(), z.number().finite()])
      .describe('Offset (dx, dy) from the reference point in user units; rejects NaN / ±Infinity'),
  })
  .describe(
    'Offset position: base point `of` plus a Cartesian `(dx, dy)` offset. Mirrors TikZ `calc` syntax `($(of) + (dx, dy)$)`. The base point may itself be a node id, a literal coordinate, or a polar expression — covering all referent shapes available to PolarPosition.origin.',
  );

/** 偏移定位 IR 类型 `{ of, offset }`，与 IRPosition/PolarPosition/IRAtPosition union 平级 */
export type IROffsetPosition = z.infer<typeof OffsetPositionSchema>;
