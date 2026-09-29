import { Layout, Node, Scope } from '@retikz/react';

/** 图形参数 */
export type ScopeZIndexPreviewValues = {
  scopeA: number;
  nodeA1: number;
  nodeA2: number;
  scopeB: number;
  nodeB1: number;
  nodeB2: number;
};

/** 绘制示例图形 */
export const ScopeZIndexPreview = (values: ScopeZIndexPreviewValues) => {
  return (
    <Layout>
      <Scope transforms={[{ kind: 'translate', x: -22, y: -14 }]} zIndex={values.scopeA}>
        <Node
          id="a1"
          position={[0, 0]}
          zIndex={values.nodeA1}
          style={{ fill: 'tomato', stroke: 'darkred', strokeWidth: 1 }}
          layout={{ minimumSize: 76 }}
        >
          A1
        </Node>
        <Node
          id="a2"
          position={[40, 0]}
          zIndex={values.nodeA2}
          style={{ fill: 'gold', stroke: 'darkorange', strokeWidth: 1 }}
          layout={{ minimumSize: 76 }}
        >
          A2
        </Node>
      </Scope>
      <Scope transforms={[{ kind: 'translate', x: 22, y: 26 }]} zIndex={values.scopeB}>
        <Node
          id="b1"
          position={[0, 0]}
          zIndex={values.nodeB1}
          style={{ fill: 'dodgerblue', stroke: 'darkblue', strokeWidth: 1 }}
          layout={{ minimumSize: 76 }}
        >
          B1
        </Node>
        <Node
          id="b2"
          position={[40, 0]}
          zIndex={values.nodeB2}
          style={{ fill: 'mediumseagreen', stroke: 'darkgreen', strokeWidth: 1 }}
          layout={{ minimumSize: 76 }}
        >
          B2
        </Node>
      </Scope>
    </Layout>
  );
};
