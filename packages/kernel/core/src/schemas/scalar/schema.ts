import { z } from 'zod';

export const NormalizedFractionSchema = z
  .number()
  .min(0)
  .max(1)
  .describe('Normalized fraction in the inclusive 0..1 range.');

export const AngleDegreesSchema = z.number().describe('Angle in degrees.');
