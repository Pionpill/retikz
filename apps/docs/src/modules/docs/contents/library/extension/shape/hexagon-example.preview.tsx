import { HexagonShapeDefinition } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type HexagonExamplePreviewValues = {
  shoulderDepth: number;
  cornerRadius: number;
};

/** 绘制示例图形 */
export const renderHexagonExamplePreview = (values: HexagonExamplePreviewValues) => (
  <Layout viewBox={{ x: -120, y: -80, width: 240, height: 160 }} extensions={{ shapes: [HexagonShapeDefinition] }}>
    <Node
      position={[0, 0]}
      shape={{ type: 'hexagon', params: { shoulderDepth: values.shoulderDepth, cornerRadius: values.cornerRadius } }}
      style={{ fill: '#ffedd5', stroke: 'darkorange', strokeWidth: 1.5 }}
      layout={{ minimumSize: { width: 140, height: 72 } }}
    />
  </Layout>
);
