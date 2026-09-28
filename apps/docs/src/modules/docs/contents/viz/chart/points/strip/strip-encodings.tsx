import { StripChart, StripEncodings } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './strip-encodings.controls';
import { stripVegaBarleyData } from './strip-vega-barley.data';

const contract = createPreviewControlContract();
const controlled = defineControlledPreview(contract, (values, dimensions) => {
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
});
/** 映射交互示例 */
const Demo: FC = controlled.Component;
/** 预览使用的控件 */
export const previewControls = contract.controls;
export { createPreviewControlContract } from './strip-encodings.controls';
/** 根据默认映射派生多种接入源码 */
export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'stripVegaBarleyData', from: './strip-vega-barley.data' } },
};
export default Demo;
