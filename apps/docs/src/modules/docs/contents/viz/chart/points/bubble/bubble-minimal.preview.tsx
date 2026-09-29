import { BubbleChart } from '@retikz/chart-react/point';

import { bubbleMinimalData } from './bubble-minimal.data';

/** 用地震数据绘制最小气泡图 */
export const renderBubbleMinimalPreview = (dimensions?: { width: number; height: number }) => (
  <BubbleChart
    layout={dimensions}
    rows={bubbleMinimalData}
    recipe={{ encodings: { x: 'depthKm', y: 'magnitude', size: 'significance' } }}
  />
);
