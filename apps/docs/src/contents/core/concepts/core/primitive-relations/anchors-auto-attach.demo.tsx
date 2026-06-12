import { Draw, Layout, Node } from '@retikz/react';
import type { FC, ReactElement } from 'react';

const DIRS: Array<{ id: string; pos: [number, number]; label: string }> = [
  { id: 'n', pos: [0, -65], label: 'N' },
  { id: 's', pos: [0, 65], label: 'S' },
  { id: 'e', pos: [78, 0], label: 'E' },
  { id: 'w', pos: [-78, 0], label: 'W' },
  { id: 'ne', pos: [65, -65], label: 'NE' },
  { id: 'nw', pos: [-65, -65], label: 'NW' },
  { id: 'se', pos: [65, 65], label: 'SE' },
  { id: 'sw', pos: [-65, 65], label: 'SW' },
];

// 一组：中心节点（gray 虚线 boundary）+ 8 个方位锚点 + 8 条自动贴边的 Draw
const renderScene = (tag: string, cx: number, shape: 'rectangle' | 'ellipse'): Array<ReactElement> => [
  <Node key={`${tag}-o`} id={`${tag}-o`} position={[cx, 0]} shape={shape} padding={12} stroke="gray" dashPattern={[4, 3]}>
    Node
  </Node>,
  ...DIRS.map(d => (
    <Node
      key={`${tag}-${d.id}`}
      id={`${tag}-${d.id}`}
      position={[cx + d.pos[0], d.pos[1]]}
      stroke="none"
      font={d.label.length > 1 ? { size: 12 } : undefined}
    >
      {d.label}
    </Node>
  )),
  ...DIRS.map(d => <Draw key={`${tag}-draw-${d.id}`} way={[`${tag}-${d.id}`, `${tag}-o`]} />),
];

const Demo: FC = () => (
  <Layout width={520} height={260}>
    {renderScene('rect', -140, 'rectangle')}
    {renderScene('ell', 140, 'ellipse')}
    <Node position={[-140, 108]} stroke="none" padding={0} textColor="gray">
      rectangle boundary
    </Node>
    <Node position={[140, 108]} stroke="none" padding={0} textColor="gray">
      ellipse boundary
    </Node>
  </Layout>
);

export default Demo;
