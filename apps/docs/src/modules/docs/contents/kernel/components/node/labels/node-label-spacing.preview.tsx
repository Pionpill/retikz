import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type NodeLabelSpacingPreviewValues = {
  direction: 'right' | 'top' | 'bottom' | 'left';
  placement: 'outside' | 'inside';
  distance: number;
};

/** 绘制示例图形 */
export const NodeLabelSpacingPreview = (values: NodeLabelSpacingPreviewValues) => (
  <Layout>
    <Node
      position={[0, 0]}
      label={{
        text: 'label',
        position: values.direction,
        placement: values.placement,
        distance: values.distance,
      }}
      style={{ fill: 'lightgray', stroke: 'gray' }}
      layout={{ minimumSize: { width: 120, height: 76 } }}
    >
      q
    </Node>
  </Layout>
);
