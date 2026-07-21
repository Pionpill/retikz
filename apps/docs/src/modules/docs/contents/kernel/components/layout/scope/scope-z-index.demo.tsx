import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract,scopeZIndexControls } from './scope-z-index.controls';

/** controls registry 未刷新时供 ComponentPreview 从 demo 模块直接解析的兜底定义 */
export const previewControls = scopeZIndexControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout width={360} height={220} viewBox={{ x: -180, y: -110, width: 360, height: 220 }}>
      <Scope transforms={[{ kind: 'translate', x: -22, y: -14 }]} zIndex={values.scopeA}>
        <Node
          id="a1"
          position={[0, 0]}
          fill="tomato"
          stroke="darkred"
          strokeWidth={1}
          minimumSize={76}
          zIndex={values.nodeA1}
        >
          A1
        </Node>
        <Node
          id="a2"
          position={[40, 0]}
          fill="gold"
          stroke="darkorange"
          strokeWidth={1}
          minimumSize={76}
          zIndex={values.nodeA2}
        >
          A2
        </Node>
      </Scope>
      <Scope transforms={[{ kind: 'translate', x: 22, y: 26 }]} zIndex={values.scopeB}>
        <Node
          id="b1"
          position={[0, 0]}
          fill="dodgerblue"
          stroke="darkblue"
          strokeWidth={1}
          minimumSize={76}
          zIndex={values.nodeB1}
        >
          B1
        </Node>
        <Node
          id="b2"
          position={[40, 0]}
          fill="mediumseagreen"
          stroke="darkgreen"
          strokeWidth={1}
          minimumSize={76}
          zIndex={values.nodeB2}
        >
          B2
        </Node>
      </Scope>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * Scope 与 Node 两级 zIndex playground
 * @description Node zIndex 只在所属 Scope 内排序；Scope zIndex 决定整组 GroupPrim 在父层的上下位置
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
