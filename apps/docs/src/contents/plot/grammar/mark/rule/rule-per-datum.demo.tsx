import { Axis, Legend, Plot, RuleMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { thresholds } from './rule-per-datum.data';

/** per-datum 阈值线：y 绑 threshold 字段（字符串 → field，每行一条水平 rule），color 绑 tier 字段按类别上色 */
const Demo: FC = () => (
  <Plot
    data={thresholds}
    model={[
      { name: 'tier', type: 'categorical' },
      { name: 'threshold', type: 'continuous' },
    ]}
    width={320}
    height={240}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <RuleMark y="threshold" color="tier" />
    <Axis dimension="y" grid />
    <Legend channel="color" />
  </Plot>
);

export default Demo;
