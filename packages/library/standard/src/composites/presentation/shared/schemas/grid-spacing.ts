import { PositiveNumberSchema } from '@retikz/foundation';
import { strictObject, union } from 'zod';

/** Standard 笛卡尔格线复用的统一或分轴正间距 */
export const StandardGridSpacingSchema = union([
  PositiveNumberSchema.describe('Uniform positive spacing on both axes.'),
  strictObject({
    x: PositiveNumberSchema.describe('Positive horizontal spacing.'),
    y: PositiveNumberSchema.describe('Positive vertical spacing.'),
  }),
]);
