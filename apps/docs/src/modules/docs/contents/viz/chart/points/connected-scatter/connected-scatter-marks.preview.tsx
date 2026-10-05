import { ConnectedScatterChart, ConnectedScatterMark } from '@retikz/chart-react/point';

import { connectedScatterData } from './connected-scatter-basic.data';

/** 图形参数 */
export type ConnectedScatterMarksPreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
  size: number;
  strokeWidth: number;
  fillOpacity: number;
  dashed: boolean;
};

/** 绘制示例图形 */
export const renderConnectedScatterMarksPreview = (
  dimensions: { width: number; height: number } | undefined,
  values: ConnectedScatterMarksPreviewValues,
) => {
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <ConnectedScatterChart
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
      rows={connectedScatterData}
      layout={{ ...bounds, padding: { right: 48 } }}

      recipe={{
        encodings: { x: 'urbanization', y: 'lifeExpectancy', order: 'year', series: 'country' },
        properties: { point: { size: values.size }, path: { strokeWidth: values.strokeWidth } },
      }}
    >
      <ConnectedScatterMark
        override
        properties={{
          point: { fillOpacity: values.fillOpacity, strokeWidth: values.strokeWidth },
          path: { ...(values.dashed ? { dashPattern: [6, 4] } : {}) },
        }}
      />
    </ConnectedScatterChart>
  );

  return chart;
};
