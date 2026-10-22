import { Plot, PlotScale, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { textRows } from './builtin-text.data';

/** 图形参数 */
export type BuiltinTextPreviewValues = {
  /** 文字颜色 */
  textColor: string;
  /** 文字水平对齐 */
  align: 'start' | 'middle' | 'end';
  /** 字号 */
  fontSize: number;
  /** 行高 */
  lineHeight: number;
  /** 最大文字宽度 */
  maxTextWidth: number;
};

/** 绘制示例图形 */
export const BuiltinTextPreview = (
  /** values */
  values: BuiltinTextPreviewValues,
  dimensions?: { width: number; height: number },
) => (
  <Layout
    viewBox={{ x: 0, y: 68, width: 520, height: 144 }}
    style={
      dimensions
        ? { width: 'auto', height: 'auto', maxWidth: dimensions.width, maxHeight: dimensions.height }
        : undefined
    }
  >
    <Plot
      data={textRows}
      model={[
        { name: 'x', type: 'continuous' },
        { name: 'y', type: 'continuous' },
        { name: 'word', type: 'categorical' },
      ]}
      width={520}
      height={280}
    >
      <PlotScale dimension="x" type="linear" domain={[0, 4]} domainPadding={0} />
      <PlotScale dimension="y" type="linear" domain={[8, 16]} domainPadding={0} />
      <PointMark
        encodings={{ text: 'word', position: { x: { field: 'x' }, y: { field: 'y' } } }}
        properties={{
          textColor: values.textColor,
          align: values.align,
          font: { size: values.fontSize, weight: 'bold' },
          lineHeight: values.lineHeight,
          maxTextWidth: values.maxTextWidth,
        }}
      />
    </Plot>
  </Layout>
);
