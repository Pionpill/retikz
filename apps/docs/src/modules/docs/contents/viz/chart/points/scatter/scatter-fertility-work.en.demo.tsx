import type { FC } from 'react';

import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';

import { fertilityWorkData } from './scatter-fertility-work.data';

/** Real-data scatter comparing fertility and female labor participation by income-group shape */
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
    <Axis dimension="x" title="Total fertility rate (births per woman)" />
    <Axis dimension="y" title="Female labor force participation (%)" />
    <Legend channel="shape" title="World Bank income group" position="right" />
  </Plot>
);

export default Demo;
