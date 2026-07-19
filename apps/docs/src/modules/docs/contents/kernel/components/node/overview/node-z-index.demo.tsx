import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { nodeZIndexControls } from './node-z-index.controls';

export const previewControls = nodeZIndexControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/**
 * zIndex 显式栈序
 * @description 声明顺序 a → b → c，默认最后声明的 c 压在最上；给最先声明的 a 设 zIndex={2}，把它浮到所有同层节点之上，而不必把它挪到 JSX 末尾。
 */
const Demo: FC = () => {
  const values = usePreviewControls(nodeZIndexControls);

  return (
    <Layout width={300} height={190}>
      {/* 声明顺序固定为 a → b → c；面板只改变显式层级 */}
      <Node id="a" position={[-32, -22]} fill="red" stroke="red" minimumSize={90} zIndex={values.zIndexA}>
        a · z={values.zIndexA}
      </Node>
      <Node id="b" position={[0, 0]} fill="dodgerblue" stroke="dodgerblue" minimumSize={90} zIndex={values.zIndexB}>
        b · z={values.zIndexB}
      </Node>
      <Node id="c" position={[32, 22]} fill="green" stroke="green" minimumSize={90} zIndex={values.zIndexC}>
        c · z={values.zIndexC}
      </Node>
    </Layout>
  );
};

export default Demo;
