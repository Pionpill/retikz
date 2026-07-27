import { defineTransform } from '@retikz/data';
import { z } from 'zod';

const WaterfallTransformSchema = z.strictObject({
  kind: z.literal('waterfall').describe('Discriminator: derive cumulative intervals for a waterfall plot'),
  field: z.string().min(1).describe('Numeric delta field read from each input row'),
  initialValue: z.number().finite().optional().describe('Cumulative value before the first row'),
});

/** 文档示例的瀑布累计变换：把增减值派生为区间与方向字段 */
export const waterfallTransform = defineTransform({
  schema: WaterfallTransformSchema,
  inputFields: operation => [operation.field],
  outputFields: () => ['from', 'to', 'direction'],
  apply: (rows, operation) => {
    let cursor = operation.initialValue ?? 0;

    return rows.map((row, index) => {
      const delta = Number(row[operation.field]);
      if (!Number.isFinite(delta)) {
        throw new Error(`waterfall: row ${index} field "${operation.field}" must be a finite number`);
      }
      const next = cursor + delta;
      const output = {
        ...row,
        from: cursor,
        to: next,
        direction: delta >= 0 ? 'increase' : 'decrease',
      };
      cursor = next;
      return output;
    });
  },
});
