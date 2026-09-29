import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './scatter-appearance.controls';
import { renderScatterAppearancePreview } from './scatter-appearance.preview';

const contract = createPreviewControlContract();
const controlledPreview = defineControlledPreview(contract, (values, dimensions) =>
  renderScatterAppearancePreview({
    layout: dimensions,
    coordinateSystem: values.coordinateSystem === 'polar2D' ? 'polar2D' : 'cartesian2D',
    size: values.size,
    opacity: values.opacity,
    stroke: values.stroke,
    strokeWidth: values.strokeWidth,
  }),
);

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
