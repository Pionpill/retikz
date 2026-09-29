import { PathMark, Plot, PlotAxis, PlotFacet, PointMark } from '@retikz/plot-react';

import { channelRows } from './coordinate-composition-facet-multilevel.data';

/** 图形参数 */
export type CoordinateCompositionFacetMultilevelPreviewValues = {
  rowHierarchy: 'business-metric' | 'metric-business';
  columnHierarchy: 'region-channel' | 'channel-region';
  rowHeaders: boolean;
  columnHeaders: boolean;
  scale: 'shared' | 'independent';
  panelGap: number;
  xGridVisible: boolean;
  yGridVisible: boolean;
  lineWidth: number;
  pointSize: number;
};

/** 绘制示例图形 */
export const CoordinateCompositionFacetMultilevelPreview = (
  values: CoordinateCompositionFacetMultilevelPreviewValues,
) => {
  const rowHierarchy =
    values.rowHierarchy === 'business-metric'
      ? [
          { field: 'business', order: ['B1', 'B2'] },
          { field: 'metric', order: ['M1', 'M2'] },
        ]
      : [
          { field: 'metric', order: ['M1', 'M2'] },
          { field: 'business', order: ['B1', 'B2'] },
        ];
  const columnHierarchy =
    values.columnHierarchy === 'region-channel'
      ? [
          { field: 'region', order: ['R1', 'R2'] },
          { field: 'channel', order: ['C1', 'C2'] },
        ]
      : [
          { field: 'channel', order: ['C1', 'C2'] },
          { field: 'region', order: ['R1', 'R2'] },
        ];

  return (
    <Plot data={channelRows} width={660} height={330}>
      <PlotFacet
        id="regionChannel"
        row={rowHierarchy}
        column={columnHierarchy}
        header={{
          row: values.rowHeaders,
          column: values.columnHeaders,
        }}
        resolve={{ scale: { y: values.scale } }}
        spacing={{ panelGap: values.panelGap }}
      >
        <PlotAxis dimension="x" grid={values.xGridVisible} />
        <PlotAxis dimension="y" grid={values.yGridVisible} />
        <PathMark x="month" y="value" order="month" stroke="darkorange" strokeWidth={values.lineWidth} />
        <PointMark x="month" y="value" fill="white" stroke="darkorange" strokeWidth={1.25} size={values.pointSize} />
      </PlotFacet>
    </Plot>
  );
};
