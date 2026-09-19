import { Draw, Layout, Node, Scope } from '@retikz/react';
import { Rectangle } from '@retikz/standard-react/shape';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scopeLocalNamespaceBasicControls } from './scope-local-namespace-basic.controls';

/** controls registry 未刷新时供 ComponentPreview 从 demo 模块直接解析的兜底定义 */
export const previewControls = scopeLocalNamespaceBasicControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const innerNodeId = values.nodeId;

  return (
    <Layout>
      <Node id="source" position={[140, -65]} style={{ stroke: 'gray', dashed: true }}>
        source
      </Node>
      <Node id="A" position={[0, 0]}>
        outer A
      </Node>
      <Rectangle
        corner1={[210, -42]}
        corner2={[350, 42]}
        style={{ fill: 'none', stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Scope localNamespace={values.localNamespace} transforms={[{ kind: 'translate', x: 280, y: 0 }]}>
        <Node id={innerNodeId} position={[0, 0]}>
          inner {innerNodeId}
        </Node>
      </Scope>
      <Draw way={['source', 'A']} arrow="->" style={{ stroke: '#2563eb', strokeWidth: 2 }} />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * localNamespace 基础隔离 playground
 * @description 外层 Node 固定使用 id="A"；面板调整内部 Node id 与 localNamespace，观察外层引用是否被同名内部节点覆盖
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
