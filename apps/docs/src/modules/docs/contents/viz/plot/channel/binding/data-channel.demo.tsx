import type { FC } from 'react';

import { DataFieldType } from '@retikz/data';
import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';

import { cities } from './data-channel.data';

/** Bind the same rows to position, color, size, and label channels on one mark. */
const Demo: FC = () => (
  <Plot
    data={cities}
    model={[
      { name: 'gdp', type: DataFieldType.Continuous },
      { name: 'life', type: DataFieldType.Continuous },
      { name: 'population', type: DataFieldType.Continuous },
      { name: 'region', type: DataFieldType.Categorical },
      { name: 'abbr', type: DataFieldType.Categorical },
    ]}
    width={460}
    height={300}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="gdp" y="life" color="region" size="population" label="abbr" labelPosition="top" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
    <Legend channel="color" position="bottom" />
    <Legend channel="size" position="right" />
  </Plot>
);

export default Demo;
