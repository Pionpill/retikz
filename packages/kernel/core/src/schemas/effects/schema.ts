import { z } from 'zod';

import { ShadowPreset } from './constants';

export const DropShadowSchema = z
  .object({
    preset: z
      .enum(ShadowPreset)
      .optional()
      .describe(
        'Tailwind-style size preset seeding offsetX / offsetY / blur / color; any explicit field below overrides it.',
      ),
    offsetX: z
      .number()
      .optional()
      .describe('Horizontal shadow offset in user units. Overrides the preset value.'),
    offsetY: z
      .number()
      .optional()
      .describe('Vertical shadow offset in user units (overrides preset); positive = downward under screen y-down.'),
    blur: z
      .number()
      .nonnegative()
      .optional()
      .describe('Shadow blur radius in user units. Overrides the preset value; 0 means hard-edged.'),
    color: z
      .string()
      .optional()
      .describe(
        'Shadow color, any CSS color (overrides preset); when neither preset nor color given = translucent black rgba(0,0,0,0.5).',
      ),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Shadow opacity multiplier applied to the resolved shadow color.'),
  })
  .refine(s => s.preset !== undefined || (s.offsetX !== undefined && s.offsetY !== undefined), {
    message: 'Provide a `preset`, or explicit `offsetX` + `offsetY`.',
  })
  .describe('Drop shadow: a `preset` (size defaults) with optional per-field overrides, or fully explicit offsets.');
