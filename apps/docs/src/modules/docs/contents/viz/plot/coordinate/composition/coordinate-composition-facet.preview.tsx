import { PathMark, Plot, PlotAxis, PlotFacet, PointMark } from '@retikz/plot-react';

import { accountRows } from './coordinate-composition-facet.data';

/** 图形参数 */
export type CoordinateCompositionFacetPreviewValues = {
  layout: 'columns' | 'grid';
  empty: 'drop' | 'show';
  headers: boolean;
  scale: 'shared' | 'independent';
  panelGap: number;
  xGridVisible: boolean;
  yGridVisible: boolean;
  lineWidth: number;
  pointSize: number;
};

/** 绘制示例图形 */
export const CoordinateCompositionFacetPreview = (values: CoordinateCompositionFacetPreviewValues) => {
  const isGrid = values.layout === 'grid';

  return (
    <Plot data={accountRows} width={660} height={330}>
      <PlotFacet
        id="accounts"
        row={isGrid ? { field: 'tier', order: ['T1', 'T2'] } : undefined}
        column={{ field: 'product', order: ['P1', 'P2', 'P3'] }}
        empty={isGrid ? values.empty : 'drop'}
        header={{
          row: values.headers,
          column: values.headers,
        }}
        resolve={{ scale: { y: values.scale } }}
        spacing={{ panelGap: values.panelGap }}
      >
        <PlotAxis dimension="x" grid={values.xGridVisible} />
        <PlotAxis dimension="y" grid={values.yGridVisible} />
        <PathMark x="month" y="accounts" order="month" stroke="steelblue" strokeWidth={values.lineWidth} />
        <PointMark x="month" y="accounts" fill="lightblue" stroke="steelblue" strokeWidth={1} size={values.pointSize} />
      </PlotFacet>
    </Plot>
  );
};
