import { Draw, Layout, Node, Scope } from '@retikz/react';
import { Rectangle } from '@retikz/standard-react/shape';

/** 图形参数 */
export type ScopeLocalNamespaceBasicPreviewValues = {
  nodeId: 'A' | 'B' | 'local-node';
  localNamespace: boolean;
};

/** 绘制示例图形 */
export const ScopeLocalNamespaceBasicPreview = (values: ScopeLocalNamespaceBasicPreviewValues) => {
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
};
