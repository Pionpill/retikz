import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { useState } from 'react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/**
 * 水合交互 demo：点击节点切换高亮 + 计数
 * @description 节点带 `id` 才能绑 `onClick`；handler 用 useState 改样式——含 hooks，
 *   故通过模块级 `previewSource` 禁止在 React 外自动执行。
 */
const Demo: FC = () => {
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(0);

  return (
    <Layout>
      <Node
        id="box"
        position={[0, 0]}
        onClick={() => {
          setActive(value => !value);
          setCount(value => value + 1);
        }}
        style={{ fill: active ? 'darkorange' : '#f1f5f9', stroke: 'darkorange' }}
      >
        点我
      </Node>
      <Node id="count" position={[0, -50]} style={{ stroke: 'none' }}>
        点击次数：{count}
      </Node>
    </Layout>
  );
};

export default Demo;
