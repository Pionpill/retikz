import { SectorShapeDefinition } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type SectorExamplePreviewValues = {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  cornerRadius: number;
};

/** 绘制示例图形 */
export const renderSectorExamplePreview = (values: SectorExamplePreviewValues) => (
  <Layout viewBox={{ x: -105, y: -85, width: 210, height: 170 }} extensions={{ shapes: [SectorShapeDefinition] }}>
    <Node
      position={[0, 0]}
      shape={{ type: 'sector', params: values }}
      style={{ fill: '#ffedd5', stroke: 'darkorange', strokeWidth: 1.5 }}
    />
  </Layout>
);
