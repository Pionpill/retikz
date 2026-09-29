import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type NodeLabelStylePreviewValues = {
  textColor: string;
  fontSize: number;
  opacity: number;
};

/** 绘制示例图形 */
export const NodeLabelStylePreview = (values: NodeLabelStylePreviewValues) => (
  <Layout>
    <Node
      position={[0, 0]}
      label={{
        text: 'styled label',
        position: 'right',
        placement: 'outside',
        textColor: values.textColor,
        font: { size: values.fontSize },
        opacity: values.opacity,
      }}
      style={{ fill: 'lightgray', stroke: 'gray' }}
      layout={{ minimumSize: { width: 120, height: 76 } }}
    >
      q
    </Node>
  </Layout>
);
