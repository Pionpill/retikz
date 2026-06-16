import { Axis, Legend, Plot, PointMark, TextMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { cities } from './data-channel.data';

/** Bind the same rows to position, style, size, and text channels. */
const Demo: FC = () => (
  <Plot
    data={cities}
    model={[
      { name: 'gdp', type: 'continuous' },
      { name: 'life', type: 'continuous' },
      { name: 'population', type: 'continuous' },
      { name: 'region', type: 'categorical' },
      { name: 'abbr', type: 'categorical' },
    ]}
    width={460}
    height={300}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="gdp" y="life" color="region" size="population" />
    <TextMark x="gdp" y="life" text="abbr" dy={-13} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
    <Legend channel="color" position="bottom" />
    <Legend channel="size" position="right" />
  </Plot>
);

export default Demo;

