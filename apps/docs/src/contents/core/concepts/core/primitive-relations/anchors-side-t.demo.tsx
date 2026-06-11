import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 边上比例点 { side, t }
 * @description 对象形态 anchor `{ side, t }` 取真实边界某条边 t∈[0,1] 处（north 西→东、west 北→南）；
 *   4 条 Draw 连到 box 上边 1/4 与 3/4、右边中点、左边 1/3 处。
 */
const Demo: FC = () => (
  <Layout width={360} height={240}>
    <Node id="box" position={[0, 0]} minimumWidth={120} minimumHeight={70}>
      box
    </Node>
    <Draw way={[[-120, -100], { id: 'box', anchor: { side: 'north', t: 0.25 } }]} arrow="->" />
    <Draw way={[[120, -100], { id: 'box', anchor: { side: 'north', t: 0.75 } }]} arrow="->" />
    <Draw way={[[150, 0], { id: 'box', anchor: { side: 'east', t: 0.5 } }]} arrow="->" />
    <Draw way={[[-150, 40], { id: 'box', anchor: { side: 'west', t: 1 / 3 } }]} arrow="->" />
  </Layout>
);

export default Demo;
