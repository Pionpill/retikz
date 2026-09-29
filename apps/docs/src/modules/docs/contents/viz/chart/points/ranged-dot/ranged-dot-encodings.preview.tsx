import { RangedDotChart, RangedDotEncodings, RangedDotProperties } from '@retikz/chart-react/point';

import { rangedDotData } from './ranged-dot-basic.data';

/** 图形参数 */
export type RangedDotEncodingsPreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
  reverse: boolean;
};

/** 绘制示例图形 */
export const renderRangedDotEncodingsPreview = (
  values: RangedDotEncodingsPreviewValues,
  dimensions?: { width: number; height: number },
) => {
  return (
    <RangedDotChart
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
      rows={rangedDotData}
      layout={dimensions}
    >
      <RangedDotEncodings
        category="country"
        start={values.reverse ? 'forestArea2022' : 'forestArea2000'}
        end={values.reverse ? 'forestArea2000' : 'forestArea2022'}
      />
      <RangedDotProperties startPoint={{ color: '#2563eb' }} endPoint={{ color: '#f97316' }} />
    </RangedDotChart>
  );
};
