import { Layout, Node } from '@retikz/react';
import { type FC, useState } from 'react';

/**
 * Hydration interaction demo: click a node to toggle highlight + count
 * @description A node needs an `id` before `onClick` can bind; the handler uses useState
 *   to change styling — it has hooks, so the mdx-side ComponentPreview must set `interactive`
 */
const Demo: FC = () => {
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(0);

  return (
    <Layout width={300} height={140}>
      <Node
        id="box"
        position={[0, 0]}
        fill={active ? 'darkorange' : '#f1f5f9'}
        stroke="darkorange"
        onClick={() => {
          setActive(value => !value);
          setCount(value => value + 1);
        }}
      >
        Click me
      </Node>
      <Node id="count" position={[0, -50]} stroke="none">
        Clicks: {count}
      </Node>
    </Layout>
  );
};

export default Demo;
