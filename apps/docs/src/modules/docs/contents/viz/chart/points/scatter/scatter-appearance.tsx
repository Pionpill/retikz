import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './scatter-appearance.controls';
import { fertilityWorkData } from './scatter-fertility-work.data';

const contract = createPreviewControlContract();
const controlledPreview = defineControlledPreview(contract, (values, dimensions) => (
  <ScatterChart
    coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
    rows={fertilityWorkData}
    layout={dimensions}
  >
    <ScatterEncodings x="fertilityRate" y="femaleLaborParticipation" color="incomeGroup" shape="incomeGroup" />
    <ScatterProperties
      size={values.size}
      opacity={values.opacity}
      stroke={values.stroke}
      strokeWidth={values.strokeWidth}
    />
  </ScatterChart>
));

/** 固定字段映射后的外观演示 */
const ScatterAppearance: FC = controlledPreview.Component;

/** 控件注册的显式回退 */
export const previewControls = contract.controls;
export { createPreviewControlContract } from './scatter-appearance.controls';

/** 使用 canonical 外观派生多种源码 */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: { 'chart.data': { name: 'fertilityWorkData', from: './scatter-fertility-work.data' } },
};

export default ScatterAppearance;
