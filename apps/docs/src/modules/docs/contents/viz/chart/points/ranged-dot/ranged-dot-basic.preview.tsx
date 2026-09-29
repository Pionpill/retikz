import { ChartData } from '@retikz/chart-react';
import { RangedDotChart, RangedDotEncodings, RangedDotProperties } from '@retikz/chart-react/point';

import { rangedDotData } from './ranged-dot-basic.data';

/** 图形参数 */
export type RangedDotBasicPreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
  pointShape: 'circle' | 'diamond' | 'rectangle';
  pointOpacity: number;
  pointSize: number;
  customEndpoints: boolean;
  startSize: number;
  startColor: string;
  endSize: number;
  endShape: 'circle' | 'diamond' | 'rectangle';
  endColor: string;
  lineColor: string;
  strokeWidth: number;
  lineStyle: 'solid' | 'dashed';
};

/** 绘制示例图形 */
export const renderRangedDotBasicPreview = (
  values: RangedDotBasicPreviewValues,
  dimensions?: { width: number; height: number },
) => {
  const chart = (
    <RangedDotChart
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
      layout={dimensions}
    >
      <ChartData data={rangedDotData} />
      <RangedDotEncodings category="country" start="forestArea2000" end="forestArea2022" />
      <RangedDotProperties
        point={{
          shape: values.pointShape,
          opacity: values.pointOpacity,
          size: values.pointSize,
        }}
        startPoint={{
          ...(values.customEndpoints ? { size: values.startSize } : {}),
          color: values.startColor,
        }}
        endPoint={{
          ...(values.customEndpoints ? { size: values.endSize } : {}),
          ...(values.customEndpoints ? { shape: values.endShape } : {}),
          color: values.endColor,
        }}
        range={{
          stroke: values.lineColor,
          strokeWidth: values.strokeWidth,
          ...(values.lineStyle === 'dashed' ? { dashPattern: [8, 4] } : {}),
        }}
      />
    </RangedDotChart>
  );
  return chart;
};
