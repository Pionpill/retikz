import { Coordinate, Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * Coordinate 链式偏移
 * @description ca → cb → cc 三个 coordinate 用 `{ of, offset }` 派生；节点 anchor 到 coordinate，移动 ca 整组跟着走。
 */
const Demo: FC = () => (
  <Layout width={420} height={180}>
    <Coordinate id="ca" position={[-140, 0]} />
    <Coordinate id="cb" position={{ of: 'ca', offset: [120, 0] }} />
    <Coordinate id="cc" position={{ of: 'cb', offset: [120, 0] }} />
    <Node id="A" position={{ of: 'ca', offset: [0, 0] }}>a</Node>
    <Node id="B" position={{ of: 'cb', offset: [0, 30] }}>b</Node>
    <Node id="C" position={{ of: 'cc', offset: [0, -30] }}>c</Node>
    <Draw way={['A', 'B']} arrow="->" stroke="gray" />
    <Draw way={['B', 'C']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
