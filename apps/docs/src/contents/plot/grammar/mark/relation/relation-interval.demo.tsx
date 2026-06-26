import type { FC } from 'react';
import { Axis, IntervalMark, Plot, PointMark, RelationMark } from '@retikz/plot-react';

import { intervalRelations } from './relation-interval.data';

const Demo: FC = () => (
  <Plot data={intervalRelations} width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <Axis dimension="x" tickLabels={false} />
    <Axis dimension="y" grid tickCount={4} />
    <IntervalMark
      x="slot"
      y="beforeValue"
      fill={{ kind: 'constant', value: '#a9e6f5' }}
      stroke="#ffffff"
      strokeWidth={0.8}
    />
    <IntervalMark
      x="slot"
      y="afterValue"
      fill={{ kind: 'constant', value: '#2d6fb8' }}
      stroke="#ffffff"
      strokeWidth={0.8}
    />
    <PointMark
      x="slot"
      y="beforeLabelY"
      text="beforeLabel"
      textColor={{ kind: 'constant', value: '#0f4661' }}
      font={{ size: 10, weight: 'bold' }}
      align="center"
    />
    <PointMark
      x="slot"
      y="afterLabelY"
      text="afterLabel"
      textColor={{ kind: 'constant', value: '#f8fbff' }}
      font={{ size: 10, weight: 'bold' }}
      align="center"
    />
    <RelationMark
      source={{ project: { x: 'negativeSourceX', y: 'negativeSourceY' } }}
      target={{ project: { x: 'negativeTargetX', y: 'negativeTargetY' } }}
      route={[
        { kind: 'line', to: { project: { x: 'negativeViaX', y: 'negativeViaY' } } },
        {
          kind: 'line',
          to: { project: { x: 'negativeTargetX', y: 'negativeViaY' } },
          label: { text: { field: 'negativeLabel' }, position: 0.5, side: 'sloped', textColor: '#8f1d1d', font: { size: 10, weight: 'bold' } },
        },
        { kind: 'line' },
      ]}
      path={{ arrow: '->', color: '#9f3030', dashPattern: [5, 4], strokeWidth: 1.1 }}
    />
    <RelationMark
      source={{ project: { x: 'positiveSourceX', y: 'positiveSourceY' } }}
      target={{ project: { x: 'positiveTargetX', y: 'positiveTargetY' } }}
      route={[
        { kind: 'line', to: { project: { x: 'positiveViaX', y: 'positiveViaY' } } },
        {
          kind: 'line',
          to: { project: { x: 'positiveTargetX', y: 'positiveViaY' } },
          label: { text: { field: 'positiveLabel' }, position: 0.5, side: 'sloped', textColor: '#166534', font: { size: 10, weight: 'bold' } },
        },
        { kind: 'line' },
      ]}
      path={{ arrow: '->', color: '#4d937e', dashPattern: [5, 4], strokeWidth: 1.1 }}
    />
  </Plot>
);

export default Demo;
