import { NonNegativeIntegerSchema } from '@retikz/foundation';
import { array, never, strictObject, string, union } from 'zod';

/** 一维集合共用的空格数量或格内标签契约 */
export const LinearCellSkeletonSchema = union([
  strictObject({
    count: NonNegativeIntegerSchema.describe('Number of contentless cells.'),
    labels: never().optional().describe('Not accepted in this input branch.'),
  }),
  strictObject({
    labels: array(string()).describe(
      'Inside-cell plain text in order; empty text means absent content. Length determines cell count.',
    ),
    count: never().optional().describe('Not accepted in this input branch.'),
  }),
]).describe('Schematic cells from either a count or symbolic labels, without real data.');
