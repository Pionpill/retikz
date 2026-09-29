import { CylinderShapeDefinition } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type CylinderExamplePreviewValues = {
  axis: 'vertical' | 'horizontal';
  capDepth: number;
};

/** 绘制示例图形 */
export const renderCylinderExamplePreview = (values: CylinderExamplePreviewValues) => (
  <Layout viewBox={{ x: -120, y: -90, width: 240, height: 180 }} extensions={{ shapes: [CylinderShapeDefinition] }}>
    <Node
      position={[0, 0]}
      shape={{ type: 'cylinder', params: { axis: values.axis, capDepth: values.capDepth } }}
      style={{ fill: '#dbeafe', stroke: '#2563eb', strokeWidth: 1.5 }}
      layout={{ minimumSize: { width: 130, height: 90 } }}
    />
  </Layout>
);
