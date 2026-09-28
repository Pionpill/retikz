import { ConnectedScatterChart, ConnectedScatterEncodings } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { connectedScatterData } from './connected-scatter-basic.data';
import { createPreviewControlContract } from './connected-scatter-encodings.controls';

const contract = createPreviewControlContract();
const controlled = defineControlledPreview(contract, (values, dimensions) => {
  return (
    <ConnectedScatterChart
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
      rows={connectedScatterData}
      layout={dimensions}
    >
      <ConnectedScatterEncodings x="urbanization" y="lifeExpectancy" order="year" series="country" />
    </ConnectedScatterChart>
  );
});
/** 映射交互示例 */
const Demo: FC = controlled.Component;
/** 预览使用的控件 */
export const previewControls = contract.controls;
export { createPreviewControlContract } from './connected-scatter-encodings.controls';
/** 根据默认映射派生多种接入源码 */
export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'connectedScatterData', from: './connected-scatter-basic.data' } },
};
export default Demo;
