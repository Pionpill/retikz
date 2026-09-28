import { RangedDotChart, RangedDotEncodings, RangedDotProperties } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { rangedDotData } from './ranged-dot-basic.data';
import { createPreviewControlContract } from './ranged-dot-encodings.controls';

const contract = createPreviewControlContract();
const controlled = defineControlledPreview(contract, (values, dimensions) => {
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
});
/** 映射交互示例 */
const Demo: FC = controlled.Component;
/** 预览使用的控件 */
export const previewControls = contract.controls;
export { createPreviewControlContract } from './ranged-dot-encodings.controls';
/** 根据默认映射派生多种接入源码 */
export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'rangedDotData', from: './ranged-dot-basic.data' } },
};
export default Demo;
