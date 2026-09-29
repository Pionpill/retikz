import { CrowFootArrowDefinition } from '@retikz/extension';
import { Draw, Layout } from '@retikz/react';

/** 图形参数 */
export type CrowFootArrowPreviewValues = {
  length: number;
  width: number;
  lineWidth: number;
  color: string;
};

/** 绘制示例图形 */
export const renderCrowFootArrowPreview = (values: CrowFootArrowPreviewValues) => (
  <Layout viewBox={{ x: -160, y: -70, width: 320, height: 140 }} extensions={{ arrows: [CrowFootArrowDefinition] }}>
    <Draw
      way={[
        [-120, 0],
        [120, 0],
      ]}
      arrow="->"
      arrowDetail={{
        end: {
          shape: 'crowFoot',
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
