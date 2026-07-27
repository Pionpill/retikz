import type { IRChild, IRNode } from '@retikz/core';

import { defineMark, EncodingSchema } from '@retikz/plot';
import { z } from 'zod';

const DiamondMarkSchema = z.strictObject({
  type: z.literal('diamond'),
  minimumSize: z.number().positive().optional(),
  fill: z.string().optional(),
  encoding: EncodingSchema,
});

type DiamondMark = z.infer<typeof DiamondMarkSchema>;

/** 自定义 diamond 图元：登记全部源字段，并把每行下沉成 Core diamond Node */
export const diamondMark = defineMark<DiamondMark>({
  schema: DiamondMarkSchema,
  collectFields: (mark, fields) => {
    fields.addChannel(mark.encoding.x);
    fields.addChannel(mark.encoding.y);
  },
  lower: (mark, rows, frame) => {
    const xField = mark.encoding.x?.field;
    const yField = mark.encoding.y?.field;
    if (xField === undefined || yField === undefined) return null;
    const nodes: Array<IRNode> = [];
    for (const row of rows) {
      const point = frame.projectRoles([row[xField], row[yField]]);
      if (!point) continue;
      nodes.push({
        type: 'node',
        position: point,
        shape: 'diamond',
        minimumSize: mark.minimumSize ?? 16,
        padding: 0,
        fill: mark.fill ?? '#f59e0b',
        strokeWidth: 0,
      });
    }
    return nodes.length === 0 ? null : ({ type: 'scope', children: nodes } satisfies IRChild);
  },
});
