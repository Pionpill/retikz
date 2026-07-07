import type { FC } from 'react';

import { DataFieldType } from '@retikz/data';
import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';

const rows = [
  { x: 1, y: 16, xFill: 4, xText: 7, colorKey: 'alpha', fillKey: 'warm', strokeKey: 'solid', textKey: 'ink', tag: 'A' },
  {
    x: 2,
    y: 22,
    xFill: 5,
    xText: 8,
    colorKey: 'beta',
    fillKey: 'cool',
    strokeKey: 'alert',
    textKey: 'muted',
    tag: 'B',
  },
  {
    x: 3,
    y: 18,
    xFill: 6,
    xText: 9,
    colorKey: 'gamma',
    fillKey: 'fresh',
    strokeKey: 'deep',
    textKey: 'accent',
    tag: 'C',
  },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'x', type: DataFieldType.Continuous },
      { name: 'xFill', type: DataFieldType.Continuous },
      { name: 'xText', type: DataFieldType.Continuous },
      { name: 'y', type: DataFieldType.Continuous },
      { name: 'colorKey', type: DataFieldType.Categorical },
      { name: 'fillKey', type: DataFieldType.Categorical },
      { name: 'strokeKey', type: DataFieldType.Categorical },
      { name: 'textKey', type: DataFieldType.Categorical },
      { name: 'tag', type: DataFieldType.Categorical },
    ]}
    width={560}
    height={260}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="x" y="y" color="colorKey" size={13} label="colorKey" labelPosition="top" />
    <PointMark
      x="xFill"
      y="y"
      fill="fillKey"
      stroke="strokeKey"
      strokeWidth={3}
      size={13}
      label="strokeKey"
      labelPosition="top"
    />
    <PointMark
      x="xText"
      y="y"
      text="tag"
      textColor="textKey"
      font={{ size: 16, weight: 'bold' }}
      label="textKey"
      labelPosition="top"
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
    <Legend channel="color" position="bottom" />
  </Plot>
);

export default Demo;
