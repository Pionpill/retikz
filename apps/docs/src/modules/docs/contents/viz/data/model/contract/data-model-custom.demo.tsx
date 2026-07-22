import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';

import { funnel } from './data-model-custom.data';

/** 对比同一数值字段在自动推断与显式分类声明下的位置间距 */
const Demo: FC = () => (
  <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
    <figure className="space-y-2">
      <figcaption className="text-center text-sm font-medium">
        <code>continuous</code>
      </figcaption>
      <Plot data={funnel} width={300} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
        <PointMark x="stage" y="rate" />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
    </figure>
    <figure className="space-y-2">
      <figcaption className="text-center text-sm font-medium">
        <code>categorical</code>
      </figcaption>
      <Plot
        data={funnel}
        model={[
          { name: 'stage', type: 'categorical' },
          { name: 'rate', type: 'continuous' },
        ]}
        width={300}
        height={220}
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <PointMark x="stage" y="rate" />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
    </figure>
  </div>
);

export default Demo;
