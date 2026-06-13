import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 多边形 / 菱形 节点
 * @description shape={{ type:'polygon', params:{ sides } }}：能容纳文字的正多边形外接圆；diamond = polygon{ sides:4, rotate:0 } 预设。
 */
const Demo: FC = () => (
  <Layout width={400} height={170}>
    <Node id="hub" position={[0, 0]} fill="lightgray">
      hub
    </Node>
    <Node id="hex" position={[-130, 0]} shape={{ type: 'polygon', params: { sides: 6 } }} fill="aliceblue">
      hexagon
    </Node>
    <Node id="dia" position={[130, 0]} shape="diamond" fill="seashell">
      diamond
    </Node>
    <Draw way={['hex', 'hub']} arrow="->" stroke="gray" />
    <Draw way={['dia', 'hub']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
