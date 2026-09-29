import { EllipticCapsuleShapeDefinition } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type EllipticCapsuleExamplePreviewValues = {
  axis: 'vertical' | 'horizontal';
  capDepth: number;
};

/** 绘制示例图形 */
export const renderEllipticCapsuleExamplePreview = (values: EllipticCapsuleExamplePreviewValues) => (
  <Layout
    viewBox={{ x: -120, y: -90, width: 240, height: 180 }}
    extensions={{ shapes: [EllipticCapsuleShapeDefinition] }}
  >
    <Node
      position={[0, 0]}
      shape={{ type: 'ellipticCapsule', params: { axis: values.axis, capDepth: values.capDepth } }}
      style={{ fill: '#ffedd5', stroke: 'darkorange', strokeWidth: 1.5 }}
      layout={{ minimumSize: { width: 130, height: 90 } }}
    />
  </Layout>
);
