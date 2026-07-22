import { z } from 'zod';

/** Standard 笛卡尔格线复用的统一或分轴正间距 */
export const StandardGridSpacingSchema = z.union([
  z.number().positive().describe('Uniform positive spacing on both axes.'),
  z.strictObject({
    x: z.number().positive().describe('Positive horizontal spacing.'),
    y: z.number().positive().describe('Positive vertical spacing.'),
  }),
]);
