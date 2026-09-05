import type { FC } from 'react';

import { DrawWay } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';

/**
 * 连线方式：直线 / 曲线 / 折线
 * @description 同样两个端点，<Draw> 的 way 给出三种连接形态——直线（默认）、曲线（`{ bend }`）、折线（`-|`）。
 */
const Demo: FC = () => (
  <Layout>
    {/* 直线 */}
    <Node id="A1" position={[-205, -10]} style={{ stroke: 'none' }}>
      a
    </Node>
    <Node id="B1" position={[-125, -10]} style={{ stroke: 'none' }}>
      b
    </Node>
    <Draw way={['A1', 'B1']} arrow="->" />

    {/* 曲线 */}
    <Node id="A2" position={[-40, -10]} style={{ stroke: 'none' }}>
      a
    </Node>
    <Node id="B2" position={[40, -10]} style={{ stroke: 'none' }}>
      b
    </Node>
    <Draw way={['A2', { bend: 'left' }, 'B2']} arrow="->" />

    {/* 折线 */}
    <Node id="A3" position={[120, -35]} style={{ stroke: 'none' }}>
      a
    </Node>
    <Node id="B3" position={[205, 25]} style={{ stroke: 'none' }}>
      b
    </Node>
    <Draw way={['A3', DrawWay.Hv, 'B3']} arrow="->" />

    <Node position={[-165, 58]} style={{ stroke: 'none', textColor: 'gray' }} layout={{ padding: 0 }}>
      straight
    </Node>
    <Node position={[0, 58]} style={{ stroke: 'none', textColor: 'gray' }} layout={{ padding: 0 }}>
      curve
    </Node>
    <Node position={[165, 58]} style={{ stroke: 'none', textColor: 'gray' }} layout={{ padding: 0 }}>
      fold
    </Node>
  </Layout>
);

export default Demo;
