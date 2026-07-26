import type { IRChild, IRNode } from '@retikz/core';
import type { IRPlotSpec } from '@retikz/plot';
import type { FC } from 'react';

import { defineMark, EncodingSchema } from '@retikz/plot';
import { Plot } from '@retikz/plot-react';
import { z } from 'zod';

import { glyphRows } from './mark-custom.data';

/**
 * 自定义图元：每行投影成一个 diamond glyph。
 * @description type='diamond' 是非内置判别串；collectFields 登记读取的源字段；lower 拿到坐标系 frame，
 *   把每行的 x/y 经 frame.projectRoles 投成屏幕点，再装配 core Node（diamond shape）。
 */
const DiamondMarkSchema = z.strictObject({
  type: z.literal('diamond'),
  encoding: EncodingSchema,
});

type DiamondMark = z.infer<typeof DiamondMarkSchema>;

const diamondMark = defineMark<DiamondMark>({
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
        minimumSize: 16,
        fill: 'darkorange',
        strokeWidth: 0,
      });
    }
    return nodes.length === 0 ? null : ({ type: 'scope', children: nodes } satisfies IRChild);
  },
});

// 自定义图元没有专属 React 组件，经 spec 入口创作：marks 里写 { type: 'diamond', ... }，运行时由 markDefinitions 解释。
const spec: IRPlotSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'glyphs' },
  coordinate: { type: 'cartesian2D', x: 'month', y: 'sales' },
  scales: [
    { type: 'linear', name: 'month' },
    { type: 'linear', name: 'sales' },
  ],
  marks: [{ type: 'diamond', encoding: { x: { field: 'month' }, y: { field: 'sales' } } }],
  guides: [
    { type: 'axis', dimension: 'x' },
    { type: 'axis', dimension: 'y', grid: true },
  ],
};

const Demo: FC = () => (
  <Plot
    spec={spec}
    data={{ glyphs: glyphRows }}
    width={420}
    height={260}
    markDefinitions={[diamondMark]}
    style={{ maxWidth: '100%', height: 'auto' }}
  />
);

export default Demo;
