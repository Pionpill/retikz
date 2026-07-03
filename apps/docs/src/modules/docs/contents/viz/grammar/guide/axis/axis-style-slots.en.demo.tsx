import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';

import { styledRevenue } from './axis-style-slots.data';

/** 样式槽位：分别定制轴线、刻度、刻度文字、标题和网格 */
const Demo: FC = () => (
  <Plot data={styledRevenue} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <PathMark x="month" y="revenue" order="month" />
    <Axis dimension="x" title="Month" />
    <Axis
      dimension="y"
      line={{ stroke: '#334155', strokeWidth: 1.5 }}
      ticks={{ count: 5, length: 6, line: { stroke: '#64748b' } }}
      tickLabels={{ gap: 6, textColor: '#475569', font: { size: 11 } }}
      title={{ text: 'Revenue', gap: 10, font: { weight: 600 } }}
      grid={{ stroke: '#cbd5e1', drawOpacity: 0.45 }}
    />
  </Plot>
);

export default Demo;
