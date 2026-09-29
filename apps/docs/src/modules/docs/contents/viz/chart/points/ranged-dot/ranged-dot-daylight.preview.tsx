import { RangedDotChart, RangedDotEncodings, RangedDotProperties } from '@retikz/chart-react/point';

import { rangedDotDaylightData } from './ranged-dot-daylight.data';

/** 在极坐标中展示每月日出和日落时间 */
export const renderRangedDotDaylightPreview = (dimensions?: { width: number; height: number }) => (
  <RangedDotChart
    rows={rangedDotDaylightData}
    layout={dimensions}
    coordinate={{
      type: 'polar2D',
      startAngle: -90,
      endAngle: 270,
      innerRadius: 0.25,
      interpolation: 'polar',
    }}
  >
    <RangedDotEncodings
      category="month"
      start={{ field: 'sunriseHour', scale: { operation: { type: 'linear', name: 'dayHour', domain: [0, 24] } } }}
      end={{ field: 'sunsetHour', scale: { reference: 'dayHour' } }}
    />
    <RangedDotProperties
      point={{ size: 5 }}
      startPoint={{ color: '#2563eb' }}
      endPoint={{ color: '#f97316' }}
      range={{ stroke: '#64748b', strokeWidth: 2 }}
    />
  </RangedDotChart>
);
