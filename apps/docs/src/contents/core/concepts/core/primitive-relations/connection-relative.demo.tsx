import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 相对位置连接：way 用 ++ 偏移从上一段终点接力
 * @description 从 a 出发，连续 { relativeAccumulate } 偏移（TikZ ++）走出阶梯，每段以上一段终点为基准，省去算绝对坐标。
 */
const Demo: FC = () => (
  <Layout width={360} height={150}>
    <Node id="A" position={[-120, 40]} stroke="none">a</Node>
    <Draw
      way={[
        'A',
        { relativeAccumulate: [55, 0] },
        { relativeAccumulate: [0, -40] },
        { relativeAccumulate: [55, 0] },
        { relativeAccumulate: [0, -40] },
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
