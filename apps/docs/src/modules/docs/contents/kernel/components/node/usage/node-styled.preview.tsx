import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type NodeStyledPreviewValues = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  dashed: boolean;
  opacity: number;
  fontFamily: 'sans-serif' | 'serif' | 'monospace';
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
};

/** 绘制示例图形 */
export const NodeStyledPreview = (values: NodeStyledPreviewValues) => {
  return (
    <Layout>
      <Node
        id="node"
        position={[0, 0]}
        shape="rectangle"
        style={{
          fill: values.fill,
          stroke: values.stroke,
          strokeWidth: values.strokeWidth,
          dashed: values.dashed,
          opacity: values.opacity,
          textColor: 'currentColor',
          font: {
            family: values.fontFamily,
            size: values.fontSize,
            weight: values.fontWeight,
            style: values.fontStyle,
          },
        }}
        layout={{ padding: 18 }}
      >
        Node
      </Node>
    </Layout>
  );
};
