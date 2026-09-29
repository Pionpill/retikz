import { Layout, Node } from '@retikz/react';

const shapeOf = (values: NodeShapePreviewValues) =>
  values.shape === 'polygon' ? { type: 'polygon', params: { sides: values.sides } } : values.shape;

/** 图形参数 */
export type NodeShapePreviewValues = {
  shape: 'rectangle' | 'circle' | 'ellipse' | 'diamond' | 'polygon';
  sides: number;
};

/** 绘制示例图形 */
export const NodeShapePreview = (values: NodeShapePreviewValues) => (
  <Layout>
    <Node
      position={[0, 0]}
      shape={shapeOf(values)}
      style={{ fill: '#fed7aa', stroke: '#c2410c', textColor: 'currentColor' }}
      layout={{ minimumSize: { width: 104, height: 64 } }}
    >
      Node
    </Node>
  </Layout>
);
