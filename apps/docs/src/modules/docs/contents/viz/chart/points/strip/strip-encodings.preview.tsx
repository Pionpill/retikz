import { StripChart, StripEncodings } from '@retikz/chart-react/point';

import { stripVegaBarleyData } from './strip-vega-barley.data';

/** 图形参数 */
export type StripEncodingsPreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
  role: 'x' | 'y';
};

/** 绘制示例图形 */
export const renderStripEncodingsPreview = (
  values: StripEncodingsPreviewValues,
  dimensions?: { width: number; height: number },
) => {
  const category = {
    field: 'site',
    scale: { operation: { type: 'point', name: 'site' } },
  } as const;
  const value = { field: 'yield', scale: { operation: { type: 'linear', name: 'yield' } } } as const;
  return (
    <StripChart
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
      rows={stripVegaBarleyData}
      layout={dimensions}
    >
      <StripEncodings {...(values.role === 'x' ? { x: category, y: value } : { x: value, y: category })} />
    </StripChart>
  );
};
