import type { IRChild } from '@retikz/core';
import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { LegendContentKind } from '@retikz/standard';
import { Legend } from '@retikz/standard-react';

const lineSample = (id: string, dashPattern?: Array<number>): IRChild => ({
  type: 'path',
  id,
  stroke: 'dodgerblue',
  strokeWidth: 2,
  lineCap: 'round',
  ...(dashPattern === undefined ? {} : { dashPattern }),
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: [42, 0] },
  ],
});

const label = (id: string, text: string): IRChild => ({ type: 'node', id, position: [0, 0], text, stroke: 'none' });

/** 用真实线型样本解释逻辑关系语义 */
const Demo: FC = () => (
  <Layout
    width={360}
    height={190}
    viewBox={{ x: -16, y: -16, width: 360, height: 190 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Legend
      title={label('relation-title', '关系')}
      padding={12}
      content={{
        kind: LegendContentKind.Items,
        rowGap: 10,
        sampleGap: 12,
        items: [
          { key: 'direct', sample: lineSample('direct-line'), label: label('direct-label', '直接关系') },
          {
            key: 'indirect',
            sample: lineSample('indirect-line', [7, 5]),
            label: label('indirect-label', '间接关系'),
          },
          {
            key: 'reference',
            sample: lineSample('reference-line', [1, 5]),
            label: label('reference-label', '参考关系'),
          },
        ],
      }}
    />
  </Layout>
);

export default Demo;
