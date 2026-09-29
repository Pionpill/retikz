import { ParallelogramShapeDefinition } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type ParallelogramExamplePreviewValues = {
  slantDirection: 'right' | 'left';
  slantAngle: number;
  cornerRadius: number;
};

/** 绘制示例图形 */
export const renderParallelogramExamplePreview = (values: ParallelogramExamplePreviewValues) => (
  <Layout
    viewBox={{ x: -120, y: -80, width: 240, height: 160 }}
    extensions={{ shapes: [ParallelogramShapeDefinition] }}
  >
    <Node
      position={[0, 0]}
      shape={{
        type: 'parallelogram',
        params: {
          slantDirection: values.slantDirection,
          slantAngle: values.slantAngle,
          cornerRadius: values.cornerRadius,
        },
      }}
      style={{ fill: '#ffedd5', stroke: 'darkorange', strokeWidth: 1.5 }}
      layout={{ minimumSize: { width: 130, height: 72 } }}
    />
  </Layout>
);
