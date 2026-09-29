import { ChartData } from '@retikz/chart-react';
import { BubbleChart, BubbleEncodings, BubbleProperties } from '@retikz/chart-react/point';

import { gapminderBubbleData } from './bubble-basic.data';

/** 图形参数 */
export type BubbleBasicPreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
  xScale: 'log' | 'linear';
  colorByContinent: boolean;
  pointStrokeWidth: number;
  pointStrokeEnabled: boolean;
  pointStroke: string;
  pointFillOpacity: number;
  pointShape: 'circle' | 'rectangle' | 'diamond';
};

/** 绘制示例图形 */
export const renderBubbleBasicPreview = (
  values: BubbleBasicPreviewValues,
  dimensions?: { width: number; height: number },
) => {
  const chart = (
    <BubbleChart
      layout={dimensions ? { ...dimensions, padding: { top: 16, right: 48, bottom: 16, left: 16 } } : undefined}
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
    >
      <ChartData data={gapminderBubbleData} />
      <BubbleEncodings
        x={
          values.xScale === 'log'
            ? { field: 'gdpPerCapita', scale: { operation: { type: 'log', name: 'gdpPerCapitaScale' } } }
            : 'gdpPerCapita'
        }
        y="lifeExpectancy"
        size="population"
        {...(values.colorByContinent ? { color: 'continent' } : {})}
      />
      <BubbleProperties
        strokeWidth={values.pointStrokeWidth}
        {...(values.pointStrokeEnabled ? { stroke: values.pointStroke } : {})}
        {...(values.pointFillOpacity === 0.7 ? {} : { fillOpacity: values.pointFillOpacity })}
        shape={values.pointShape}
      />
    </BubbleChart>
  );
  return chart;
};
