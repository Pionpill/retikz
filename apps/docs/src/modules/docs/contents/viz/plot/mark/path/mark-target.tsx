import { PathMark, Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

const rows = [
  { id: 'A', x: 1, y: 2, target: 'D' },
  { id: 'B', x: 2, y: 7, target: 'E' },
  { id: 'C', x: 2.5, y: 4, target: 'A' },
  { id: 'D', x: 3.5, y: 1.5, target: 'G' },
  { id: 'E', x: 4, y: 8.5, target: 'H' },
  { id: 'F', x: 4.5, y: 5, target: 'C' },
  { id: 'G', x: 6, y: 2.5, target: 'J' },
  { id: 'H', x: 6.5, y: 7.5, target: 'K' },
  { id: 'I', x: 7, y: 5, target: 'F' },
  { id: 'J', x: 8.5, y: 1.5, target: 'L' },
  { id: 'K', x: 9, y: 8.5, target: 'I' },
  { id: 'L', x: 9, y: 4, target: 'I' },
];

/** 每行数据生成散点，并通过目标身份字段连接另一个散点 */
const MarkTarget: FC = () => (
  <Plot data={rows} width={400} height={240}>
    <PlotScale dimension="x" type="linear" domain={[0, 10]} />
    <PlotScale dimension="y" type="linear" domain={[0, 10]} />
    <PointMark
      id="nodes"
      encodings={{ anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } }, label: { text: 'id' } }}
      properties={{ shape: 'circle', size: 8, label: { position: 'top', distance: 5 } }}
    />
    <PathMark
      encodings={{
        from: { mark: 'nodes', key: { field: 'id' } },
        to: { mark: 'nodes', key: { field: 'target' } },
      }}
      properties={{ strokeWidth: 2, zIndex: -1 }}
    />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" />
  </Plot>
);

export default MarkTarget;
