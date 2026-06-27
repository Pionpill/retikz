import { Layout, Node, fadeIn, stagger } from '@retikz/react';
import type { FC } from 'react';

// 错峰：3 个节点同样 fadeIn，依次延迟 0 / 150 / 300ms 入场
const [a, b, c] = stagger([fadeIn(), fadeIn(), fadeIn()], 150);

const Demo: FC = () => (
  <Layout width={260} height={100}>
    <Node id="a" position={[0, 0]} fill="#3b82f6" animations={[a]}>1</Node>
    <Node id="b" position={[80, 0]} fill="#3b82f6" animations={[b]}>2</Node>
    <Node id="c" position={[160, 0]} fill="#3b82f6" animations={[c]}>3</Node>
  </Layout>
);

export default Demo;
