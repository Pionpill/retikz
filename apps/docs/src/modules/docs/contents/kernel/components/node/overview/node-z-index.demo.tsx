import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeZIndexControls, previewControlContract } from './node-z-index.controls';

export const previewControls = nodeZIndexControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout>
      {/* 声明顺序固定为 a → b → c；面板只改变显式层级 */}
      <Node
        id="a"
        position={[-32, -22]}
        zIndex={values.zIndexA}
        style={{ fill: 'red', stroke: 'red' }}
        layout={{ minimumSize: 90 }}
      >
        a · z={values.zIndexA}
      </Node>
      <Node
        id="b"
        position={[0, 0]}
        zIndex={values.zIndexB}
        style={{ fill: 'dodgerblue', stroke: 'dodgerblue' }}
        layout={{ minimumSize: 90 }}
      >
        b · z={values.zIndexB}
      </Node>
      <Node
        id="c"
        position={[32, 22]}
        zIndex={values.zIndexC}
        style={{ fill: 'green', stroke: 'green' }}
        layout={{ minimumSize: 90 }}
      >
        c · z={values.zIndexC}
      </Node>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * zIndex 显式栈序
 * @description 声明顺序 a → b → c，默认最后声明的 c 压在最上；给最先声明的 a 设 zIndex={2}，把它浮到所有同层节点之上，而不必把它挪到 JSX 末尾。
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
