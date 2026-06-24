import { PlotFieldType } from '@retikz/plot';
import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { cities } from './data-channel.data';

/** Bind the same rows to position, color, size, and label channels on one mark. */
const Demo: FC = () => (
  <Plot
    data={cities}
    model={[
      { name: 'gdp', type: PlotFieldType.Continuous },
      { name: 'life', type: PlotFieldType.Continuous },
      { name: 'population', type: PlotFieldType.Continuous },
      { name: 'region', type: PlotFieldType.Categorical },
      { name: 'abbr', type: PlotFieldType.Categorical },
    ]}
    width={460}
    height={300}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="gdp" y="life" color="region" size="population" label="abbr" labelPosition="above" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
    <Legend channel="color" position="bottom" />
    <Legend channel="size" position="right" />
  </Plot>
);

export default Demo;
