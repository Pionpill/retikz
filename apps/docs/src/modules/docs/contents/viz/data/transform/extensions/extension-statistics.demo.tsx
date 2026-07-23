import type { IRDataModel } from '@retikz/data';
import type { FC } from 'react';

import { defineRowSelector, defineStatisticsReducer } from '@retikz/data';
import { Axis, Plot, PointMark, Transform } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import { z } from 'zod';

import { scoreRows } from './extension-statistics.data';

/** 取一组有限数值的中点 */
const midpoint = defineStatisticsReducer({
  schema: z.strictObject({
    kind: z.literal('midpoint'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => {
    const values = rows.map(row => Number(row[operation.field])).filter(Number.isFinite);
    if (values.length === 0) return { [operation.as]: Number.NaN };
    return { [operation.as]: (Math.min(...values) + Math.max(...values)) / 2 };
  },
});

/** 选择一组数据中最接近均值的原始行 */
const closestToMean = defineRowSelector({
  schema: z.strictObject({
    kind: z.literal('closest-to-mean'),
    field: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  select: (rows, operation) => {
    const candidates = rows
      .map(row => ({ row, value: Number(row[operation.field]) }))
      .filter(candidate => Number.isFinite(candidate.value));
    if (candidates.length === 0) return [];
    const mean = candidates.reduce((sum, candidate) => sum + candidate.value, 0) / candidates.length;
    const selected = candidates.reduce((best, candidate) =>
      Math.abs(candidate.value - mean) < Math.abs(best.value - mean) ? candidate : best,
    );
    return [{ row: selected.row }];
  },
});

const model: IRDataModel = [
  { name: 'group', type: 'categorical' },
  { name: 'score', type: 'continuous' },
];

const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot
      data={scoreRows}
      model={model}
      statisticsReducerDefinitions={[midpoint]}
      width={300}
      height={220}
      x={0}
      y={20}
    >
      <Transform
        kind="summarize"
        groupBy={['group']}
        metrics={[{ kind: 'midpoint', field: 'score', as: 'midpoint' }]}
      />
      <PointMark x="group" y="midpoint" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot
      data={scoreRows}
      model={model}
      rowSelectorDefinitions={[closestToMean]}
      width={300}
      height={220}
      x={320}
      y={20}
    >
      <Transform kind="select" groupBy={['group']} selector={{ kind: 'closest-to-mean', field: 'score' }} />
      <PointMark x="group" y="score" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
