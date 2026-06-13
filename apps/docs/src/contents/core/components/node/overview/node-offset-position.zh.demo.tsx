import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * Node `offset` 任意 (dx, dy) 偏移定位
 * @description A 的位置 = B + (80, 50)。`{ of, offset }` 让"相对于命名节点偏移"成为一等表达，省去手算 atan2 / hypot。
 */
const Demo: FC = () => (
  <Layout width={320} height={180}>
    <Node id="B" position={[0, 0]}>b</Node>
    <Node id="A" position={{ of: 'B', offset: [80, 50] }}>a</Node>
    <Draw way={['B', 'A']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
