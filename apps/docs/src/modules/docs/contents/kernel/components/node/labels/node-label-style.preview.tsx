import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type NodeLabelStylePreviewValues = {
  textColor: string;
  fontSize: number;
  opacity: number;
  multiline: boolean;
  /** 文本块内部对齐 */
  textAlign: 'start' | 'middle' | 'end';
  /** 最小行槽高度 */
  lineHeight: number;
  /** 自动折行宽度 */
  maxTextWidth: number;
};

/** 绘制示例图形 */
export const NodeLabelStylePreview = (values: NodeLabelStylePreviewValues) => (
  <Layout>
    <Node
      position={[0, 0]}
      label={{
        text: values.multiline ? ['styled label', { text: 'second line', font: { weight: 'bold' } }] : 'styled label',
        position: 'right',
        placement: 'outside',
        textColor: values.textColor,
        font: { size: values.fontSize },
        opacity: values.opacity,
        textAlign: values.textAlign,
        lineHeight: values.lineHeight,
        maxTextWidth: values.maxTextWidth,
      }}
      style={{ fill: 'lightgray', stroke: 'gray' }}
      layout={{ minimumSize: { width: 120, height: 76 } }}
    >
      q
    </Node>
  </Layout>
);
