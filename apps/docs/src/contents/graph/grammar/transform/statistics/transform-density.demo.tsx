import type { FC } from 'react';

import { Axis, PathMark, Plot, Transform } from '@retikz/plot-react';

import { measurements } from './transform-density.data';

/** density：KDE 先生成 densityX / density 采样行，PathMark 用 baseline closure 把曲线填成面积 */
const Demo: FC = () => (
  <Plot data={measurements} width={440} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="density" field="value" groupBy={['group']} sampleCount={80} xAs="densityX" densityAs="density" />
    <PathMark
      x="densityX"
      y="density"
      series="group"
      color="group"
      order="densityX"
      closure={{ kind: 'baseline', baseline: 0 }}
      fill="#60a5fa"
      strokeWidth={2.2}
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid tickLabels={false} />
  </Plot>
);

export default Demo;
