import type { DataModel } from '@retikz/plot';
import type { FC } from 'react';

import { defineTransform } from '@retikz/plot';
import { Axis, Plot, PointMark, Transform } from '@retikz/plot-react';
import { z } from 'zod';

import { customTransformRows } from './transform-custom.data';

const doubleX = defineTransform({
  schema: z.object({
    kind: z.literal('double-x').describe('Discriminator: double the selected x-like field'),
    field: z.string().min(1).describe('Input field read from each row'),
    as: z.string().min(1).describe('Output field written to each row'),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  apply: (rows, operation) =>
    rows.map(row => ({
      ...row,
      [operation.as]: Number(row[operation.field]) * 2,
    })),
});

const model: DataModel = [
  { name: 'x', type: 'continuous' },
  { name: 'y', type: 'continuous' },
];

const Demo: FC = () => (
  <Plot
    data={customTransformRows}
    model={model}
    width={420}
    height={260}
    transformDefinitions={[doubleX]}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Transform kind="double-x" field="x" as="x2" />
    <PointMark x="x2" y="y" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
