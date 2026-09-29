import { RangedDotChart } from '@retikz/chart-react/point';

import { rangedDotMinimalData } from './ranged-dot-minimal.data';

/** 绘制示例图形 */
export const renderRangedDotMinimalPreview = (dimensions: { width: number; height: number } | undefined) => (
  <RangedDotChart
    layout={dimensions}
    rows={rangedDotMinimalData}
    recipe={{
      encodings: { category: 'day', start: 'minimumTemperature', end: 'maximumTemperature' },
    }}
  />
);
