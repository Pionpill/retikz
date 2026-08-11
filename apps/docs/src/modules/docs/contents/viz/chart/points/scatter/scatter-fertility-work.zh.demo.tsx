import type { FC } from 'react';

import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';

import { fertilityWorkData } from './scatter-fertility-work.data';

/** 用收入组形状比较生育率与女性劳动参与率的真实数据散点图 */
const Demo: FC = () => (
  <Plot
    data={fertilityWorkData}
    model={[
      { name: 'fertilityRate', type: 'continuous' },
      { name: 'femaleLaborParticipation', type: 'continuous' },
      { name: 'incomeGroup', type: 'categorical' },
    ]}
    width={800}
    height={400}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="fertilityRate" y="femaleLaborParticipation" shape="incomeGroup" size={4.5} opacity={0.65} />
    <Axis dimension="x" title="总和生育率（每名女性的生育数）" />
    <Axis dimension="y" title="女性劳动参与率（%）" />
    <Legend channel="shape" title="World Bank 收入组" position="right" />
  </Plot>
);

export default Demo;
