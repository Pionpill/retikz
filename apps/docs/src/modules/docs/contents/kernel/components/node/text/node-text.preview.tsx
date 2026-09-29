import type { IRFont, IRLine } from '@retikz/core';
import { Layout, Node } from '@retikz/react';

const fontOf = (emphasis: 'normal' | 'bold' | 'italic' | 'bold-italic'): IRFont => ({
  weight: emphasis === 'bold' || emphasis === 'bold-italic' ? 'bold' : 'normal',
  style: emphasis === 'italic' || emphasis === 'bold-italic' ? 'italic' : 'normal',
});

/** 图形参数 */
export type NodeTextPreviewValues = {
  content:
    | 'A\nB\nC'
    | 'A longer sentence wraps across several lines\nSecond line\n第三行文字也会自动折行'
    | 'First\nSecond\nThird'
    | 'Short\nline\nset';
  firstFill: string;
  secondFill: string;
  restFill: string;
  firstOpacity: number;
  secondOpacity: number;
  restOpacity: number;
  firstEmphasis: 'bold' | 'normal' | 'italic' | 'bold-italic';
  secondEmphasis: 'bold' | 'normal' | 'italic' | 'bold-italic';
  restEmphasis: 'bold' | 'normal' | 'italic' | 'bold-italic';
  shape: 'rectangle' | 'circle' | 'ellipse' | 'diamond';
  align: 'middle' | 'start' | 'end';
  maxTextWidth: number;
  lineHeight: number;
};

/** 绘制示例图形 */
export const NodeTextPreview = (values: NodeTextPreviewValues) => {
  const lines = values.content.replaceAll('\r', '').split('\n');
  const text = lines.map((line, index): IRLine => {
    const fill = index === 0 ? values.firstFill : index === 1 ? values.secondFill : values.restFill;
    const opacity = index === 0 ? values.firstOpacity : index === 1 ? values.secondOpacity : values.restOpacity;
    const emphasis = index === 0 ? values.firstEmphasis : index === 1 ? values.secondEmphasis : values.restEmphasis;
    return { text: line || ' ', fill, opacity, font: fontOf(emphasis) };
  });

  return (
    <Layout>
      <Node
        id="Q"
        position={[0, 0]}
        shape={values.shape}
        text={text}
        style={{ fill: 'lightgray', stroke: 'gray' }}
        layout={{
          align: values.align,
          maxTextWidth: values.maxTextWidth,
          lineHeight: values.lineHeight,
          minimumSize: { width: 80, height: 48 },
          padding: { x: 18, y: 12 },
        }}
      />
    </Layout>
  );
};
