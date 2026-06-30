import type { FC } from 'react';

import { Axis, Legend, Plot, ReferenceMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { thresholds } from './rule-per-datum.data';

/** per-datum 阈值线：y 绑 threshold 字段（字符串 → field，每行一条水平 rule），color 绑 tier 字段按类别上色 */
const Demo: FC = () => (
  <Layout width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot
      data={thresholds}
      model={[
        { name: 'tier', type: 'categorical' },
        { name: 'threshold', type: 'continuous' },
      ]}
      width={300}
      height={220}
      x={0}
      y={30}
    >
      <ReferenceMark y="threshold" color="tier" />
      <Axis dimension="y" grid />
      <Legend channel="color" />
    </Plot>
    <Plot
      data={thresholds}
      model={[
        { name: 'tier', type: 'categorical' },
        { name: 'threshold', type: 'continuous' },
      ]}
      width={260}
      height={260}
      coordinate="polar2D"
      x={350}
      y={0}
    >
      <ReferenceMark y="threshold" color="tier" />
      <Axis dimension="y" grid />
      <Legend channel="color" />
    </Plot>
  </Layout>
);

export default Demo;
