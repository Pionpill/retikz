import type { IRPlot } from '@retikz/plot';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { glyphRows } from './mark-custom.data';
import { diamondMark } from './mark-custom.definition';

/** 图形参数 */
export type MarkCustomPreviewValues = {
  size: number;
  fill: string;
};

/** 绘制示例图形 */
export const MarkCustomPreview = (values: MarkCustomPreviewValues) => {
  const spec: IRPlot = {
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'glyphs' },
    coordinate: { type: 'cartesian2D', x: 'month', y: 'sales' },
    scales: [
      { type: 'linear', name: 'month' },
      { type: 'linear', name: 'sales' },
    ],
    marks: [
      {
        type: 'diamond',
        minimumSize: values.size,
        fill: values.fill,
        encoding: { x: { field: 'month' }, y: { field: 'sales' } },
      },
    ],
    guides: [
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
    ],
  };

  return (
    <Layout viewBox={{ x: -15, y: -15, width: 450, height: 290 }}>
      <Plot spec={spec} data={{ glyphs: glyphRows }} width={420} height={260} markDefinitions={[diamondMark]} />
    </Layout>
  );
};
