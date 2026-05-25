import type { PatternDefinition } from '@retikz/react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 同一个 motif、不同 tile 周期：`pattern.size` 覆盖 def 的 defaultSize，控制图案疏密。
 * dedup 按 spec 结构——size 不同 → 两个独立资源 / tile。
 */
const dotsGrid: PatternDefinition = {
  defaultSize: 10,
  emit: ({ size, color }) => [
    { type: 'ellipse', cx: size / 2, cy: size / 2, rx: 1.5, ry: 1.5, fill: color },
  ],
};

const Demo: FC = () => (
  <Layout width={260} height={110} patterns={{ dotsGrid }}>
    <Node id="a" position={[0, 0]} minimumWidth={90} minimumHeight={80} fill={{ type: 'pattern', shape: 'dotsGrid', size: 6, color: 'green' }} stroke="green" />
    <Node id="b" position={[120, 0]} minimumWidth={90} minimumHeight={80} fill={{ type: 'pattern', shape: 'dotsGrid', size: 16, color: 'green' }} stroke="green" />
  </Layout>
);

export default Demo;
