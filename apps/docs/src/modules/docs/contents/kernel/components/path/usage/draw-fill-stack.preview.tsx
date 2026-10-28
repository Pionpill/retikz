import { Draw, Layout } from '@retikz/react';
import { DrawWay } from '@retikz/vanilla';

/** 图形参数 */
export type DrawFillStackPreviewValues = {
  zIndexA: number;
  fillA: string;
  fillOpacity: number;
  fillB: string;
};

/** 绘制示例图形 */
export const DrawFillStackPreview = (values: DrawFillStackPreviewValues) => {
  return (
    <Layout viewBox={{ x: 0, y: 0, width: 220, height: 190 }}>
      <Draw
        way={[[20, 20], [120, 20], [120, 120], [20, 120], DrawWay.Cycle]}
        zIndex={values.zIndexA}
        style={{ fill: values.fillA, stroke: values.fillA, strokeWidth: 2, opacity: { fill: values.fillOpacity } }}
      />
      <Draw
        way={[[75, 70], [175, 70], [175, 170], [75, 170], DrawWay.Cycle]}
        style={{ fill: values.fillB, stroke: values.fillB, strokeWidth: 2, opacity: { fill: values.fillOpacity } }}
      />
    </Layout>
  );
};
