import { TrapezoidShapeDefinition } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type TrapezoidExamplePreviewValues = {
  shortSide: 'right' | 'left' | 'top' | 'bottom';
  shortSideRatio: number;
  cornerRadius: number;
};

/** 绘制示例图形 */
export const renderTrapezoidExamplePreview = (values: TrapezoidExamplePreviewValues) => (
  <Layout viewBox={{ x: -120, y: -80, width: 240, height: 160 }} extensions={{ shapes: [TrapezoidShapeDefinition] }}>
    <Node
      position={[0, 0]}
      shape={{
        type: 'trapezoid',
        params: {
          shortSide: values.shortSide,
          shortSideRatio: values.shortSideRatio,
          cornerRadius: values.cornerRadius,
        },
      }}
      style={{ fill: '#ffedd5', stroke: 'darkorange', strokeWidth: 1.5 }}
      layout={{ minimumSize: { width: 130, height: 72 } }}
    />
  </Layout>
);
