import { BubbleChart, BubbleMark } from '@retikz/chart-react/point';

import { gapminderBubbleData } from './bubble-basic.data';

/** 气泡图元覆盖示例的图形参数 */
export type BubbleMarksPreviewOptions = {
  dimensions?: { width: number; height: number };
  coordinateSystem: 'cartesian2D' | 'polar2D';
  fillOpacity: number;
  strokeWidth: number;
};

/** 覆盖默认气泡图元并调整外观 */
export const renderBubbleMarksPreview = (options: BubbleMarksPreviewOptions) => {
  const { dimensions, coordinateSystem, fillOpacity, strokeWidth } = options;
  const bounds = dimensions ?? { width: 720, height: 440 };

  return (
    <BubbleChart
      coordinate={{ type: coordinateSystem }}
      rows={gapminderBubbleData}
      layout={{ ...bounds, padding: { right: 48 } }}
      recipe={{
        encodings: {
          x: 'gdpPerCapita',
          y: 'lifeExpectancy',
          size: 'population',
          color: 'continent',
        },
        properties: { fillOpacity: 0.55 },
      }}
    >
      <BubbleMark override properties={{ fillOpacity, strokeWidth }} />
    </BubbleChart>
  );
};
