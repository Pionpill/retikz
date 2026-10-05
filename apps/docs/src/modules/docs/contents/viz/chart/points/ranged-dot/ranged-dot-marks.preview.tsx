import { RangedDotChart, RangedDotMark } from '@retikz/chart-react/point';

import { rangedDotData } from './ranged-dot-basic.data';

/** 图形参数 */
export type RangedDotMarksPreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
  shape: 'circle' | 'diamond' | 'rectangle';
  endSize: number;
  strokeWidth: number;
};

/** 绘制示例图形 */
export const renderRangedDotMarksPreview = (
  dimensions: { width: number; height: number } | undefined,
  values: RangedDotMarksPreviewValues,
) => {
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <RangedDotChart
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
      rows={rangedDotData}
      layout={bounds}

      recipe={{
        encodings: { category: 'country', start: 'forestArea2000', end: 'forestArea2022' },
        properties: { point: { size: 5 }, startPoint: { color: 'darkorange' }, endPoint: { color: 'dodgerblue' } },
      }}
    >
      <RangedDotMark
        override
        properties={{
          endPoint: { shape: values.shape, size: values.endSize },
          range: { strokeWidth: values.strokeWidth },
        }}
      />
    </RangedDotChart>
  );

  return chart;
};
