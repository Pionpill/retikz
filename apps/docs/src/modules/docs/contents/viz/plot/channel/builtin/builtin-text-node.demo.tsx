import type { FC } from 'react';

import { DataFieldType } from '@retikz/data';
import { Axis, Plot, PointMark } from '@retikz/plot-react';

const rows = [
  { x: 1, y: 12, word: 'red text', ink: 'red' },
  { x: 2, y: 18, word: 'green text', ink: 'green' },
  { x: 3, y: 15, word: 'blue text', ink: 'blue' },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'x', type: DataFieldType.Continuous },
      { name: 'y', type: DataFieldType.Continuous },
      { name: 'word', type: DataFieldType.Categorical },
      { name: 'ink', type: DataFieldType.Categorical },
    ]}
    width={380}
    height={230}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark
      x="x"
      y="y"
      text="word"
      textColor="ink"
      align="middle"
      maxTextWidth={96}
      lineHeight={1.1}
      font={{ size: 13, weight: 'bold' }}
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
