import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type NodeLabelListPreviewValues = {
  mode: 'single' | 'multiple';
};

/** 绘制示例图形 */
export const NodeLabelListPreview = (values: NodeLabelListPreviewValues) => (
  <Layout>
    <Node
      position={[0, 0]}
      label={
        values.mode === 'multiple'
          ? [
              { text: 'status', position: 'top' },
              { text: 'owner', position: 'bottom' },
            ]
          : { text: 'status', position: 'top' }
      }
      style={{ fill: 'lightgray', stroke: 'gray' }}
      layout={{ minimumSize: { width: 120, height: 76 } }}
    >
      q
    </Node>
  </Layout>
);
