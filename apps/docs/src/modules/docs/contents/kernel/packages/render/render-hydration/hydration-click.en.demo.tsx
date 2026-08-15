import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { useState } from 'react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/**
 * Hydration interaction demo: click a node to toggle highlight + count
 * @description A node needs an `id` before `onClick` can bind; the handler uses useState
 *   to change styling, so module-level `previewSource` prevents execution outside React.
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
