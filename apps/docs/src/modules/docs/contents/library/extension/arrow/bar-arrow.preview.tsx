import { BarArrowDefinition } from '@retikz/extension';
import { Draw, Layout } from '@retikz/react';

/** 图形参数 */
export type BarArrowPreviewValues = {
  length: number;
  width: number;
  lineWidth: number;
  color: string;
};

/** 绘制示例图形 */
export const renderBarArrowPreview = (values: BarArrowPreviewValues) => (
  <Layout viewBox={{ x: -160, y: -70, width: 320, height: 140 }} extensions={{ arrows: [BarArrowDefinition] }}>
    <Draw
      way={[
        [-120, 0],
        [120, 0],
      ]}
      arrow="->"
      arrowDetail={{
        end: {
          shape: 'bar',
          length: values.length,
          width: values.width,
          lineWidth: values.lineWidth,
          color: values.color,
        },
      }}
      style={{ stroke: '#64748b', strokeWidth: 2 }}
    />
  </Layout>
);
