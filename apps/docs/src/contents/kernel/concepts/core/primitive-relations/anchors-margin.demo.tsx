import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * margin 对连接端点的作用
 * @description 三组对照：1) 无 margin，auto 端点贴视觉 border；
 *   2) 有 margin，auto 是 border 锚点 → 整体外移，留出间隙；
 *   3) 同样有 margin，但用 `{ side, t }` 边点 → 取视觉 border、不吃 margin，仍贴死。
 */
const Demo: FC = () => (
  <Layout width={620} height={160}>
    {/* 无 margin：auto 端点贴视觉 border */}
    <Node id="a1" position={[-270, -10]} padding={10} stroke="gray" dashPattern={[4, 3]}>a</Node>
    <Node id="b1" position={[-160, -10]} padding={10} stroke="gray" dashPattern={[4, 3]}>b</Node>
    <Draw way={['a1', 'b1']} stroke="currentColor" strokeWidth={2} />

    {/* margin：border 锚点（auto）整体外移，留出间隙 */}
    <Node id="a2" position={[-40, -10]} padding={10} margin={12} stroke="gray" dashPattern={[4, 3]}>a</Node>
    <Node id="b2" position={[70, -10]} padding={10} margin={12} stroke="gray" dashPattern={[4, 3]}>b</Node>
    <Draw way={['a2', 'b2']} stroke="currentColor" strokeWidth={2} />

    {/* margin + {side,t}：边点取视觉 border，不吃 margin，仍贴死 */}
    <Node id="a3" position={[190, -10]} padding={10} margin={12} stroke="gray" dashPattern={[4, 3]}>a</Node>
    <Node id="b3" position={[300, -10]} padding={10} margin={12} stroke="gray" dashPattern={[4, 3]}>b</Node>
    <Draw
      way={[
        { id: 'a3', anchor: { side: 'east', t: 0.5 } },
        { id: 'b3', anchor: { side: 'west', t: 0.5 } },
      ]}
      stroke="currentColor"
      strokeWidth={2}
    />

    <Node position={[-215, 42]} stroke="none" padding={0} textColor="gray">
      margin 0
    </Node>
    <Node position={[15, 42]} stroke="none" padding={0} textColor="gray">
      margin · border anchor
    </Node>
    <Node position={[245, 42]} stroke="none" padding={0} textColor="gray">
      margin · {'{side,t}'}
    </Node>
  </Layout>
);

export default Demo;
