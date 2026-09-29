import { StarShapeDefinition } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type StarExamplePreviewValues = {
  points: number;
  innerRadius: number;
  outerRadius: number;
  rotate: number;
  cornerRadius: number;
};

/** 绘制示例图形 */
export const renderStarExamplePreview = (values: StarExamplePreviewValues) => (
  <Layout viewBox={{ x: -105, y: -85, width: 210, height: 170 }} extensions={{ shapes: [StarShapeDefinition] }}>
    <Node
      position={[0, 0]}
      shape={{ type: 'star', params: values }}
      style={{ fill: '#dbeafe', stroke: '#2563eb', strokeWidth: 1.5 }}
    />
  </Layout>
);
