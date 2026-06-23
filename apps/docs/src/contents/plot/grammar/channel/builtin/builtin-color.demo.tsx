import { PlotFieldType } from '@retikz/plot';
import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

const rows = [
  { x: 1, y: 16, xFill: 4, xText: 7, colorKey: 'alpha', fillKey: 'warm', strokeKey: 'solid', textKey: 'ink', tag: 'A' },
  { x: 2, y: 22, xFill: 5, xText: 8, colorKey: 'beta', fillKey: 'cool', strokeKey: 'alert', textKey: 'muted', tag: 'B' },
  { x: 3, y: 18, xFill: 6, xText: 9, colorKey: 'gamma', fillKey: 'fresh', strokeKey: 'deep', textKey: 'accent', tag: 'C' },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'x', type: PlotFieldType.Continuous },
      { name: 'xFill', type: PlotFieldType.Continuous },
      { name: 'xText', type: PlotFieldType.Continuous },
      { name: 'y', type: PlotFieldType.Continuous },
      { name: 'colorKey', type: PlotFieldType.Categorical },
      { name: 'fillKey', type: PlotFieldType.Categorical },
      { name: 'strokeKey', type: PlotFieldType.Categorical },
      { name: 'textKey', type: PlotFieldType.Categorical },
      { name: 'tag', type: PlotFieldType.Categorical },
    ]}
    width={560}
    height={260}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="x" y="y" color="colorKey" size={13} label="colorKey" labelPosition="above" />
    <PointMark x="xFill" y="y" fill="fillKey" stroke="strokeKey" strokeWidth={3} size={13} label="strokeKey" labelPosition="above" />
    <PointMark x="xText" y="y" text="tag" textColor="textKey" font={{ size: 16, weight: 'bold' }} label="textKey" labelPosition="above" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
    <Legend channel="color" position="bottom" />
  </Plot>
);

export default Demo;
