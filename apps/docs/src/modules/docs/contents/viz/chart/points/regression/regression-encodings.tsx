import { RegressionChart, RegressionEncodings } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { irisRegressionData } from './regression-basic.data';
import { createPreviewControlContract } from './regression-encodings.controls';

const contract = createPreviewControlContract();
const controlled = defineControlledPreview(contract, (values, dimensions) => {
  return (
    <RegressionChart rows={irisRegressionData} layout={dimensions}>
      <RegressionEncodings x="sepalLengthCm" y="petalLengthCm" {...(values.group ? { series: 'species' } : {})} />
    </RegressionChart>
  );
});
/** 映射交互示例 */
const Demo: FC = controlled.Component;
/** 预览使用的控件 */
export const previewControls = contract.controls;
export { createPreviewControlContract } from './regression-encodings.controls';
/** 根据默认映射派生多种接入源码 */
export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'irisRegressionData', from: './regression-basic.data' } },
};
export default Demo;
