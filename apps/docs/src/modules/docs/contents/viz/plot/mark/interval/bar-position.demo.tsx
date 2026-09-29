import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { BAR_POSITION_CONTROL_IDS, previewControlContract } from './bar-basic.controls';
import { BarPositionPreview } from './bar-position.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  BarPositionPreview({
    coordinate: values[BAR_POSITION_CONTROL_IDS.coordinate],
    direction: values[BAR_POSITION_CONTROL_IDS.direction],
    showLabels: values[BAR_POSITION_CONTROL_IDS.showLabels],
    shadow: values[BAR_POSITION_CONTROL_IDS.shadow],
    cornerRadius: values[BAR_POSITION_CONTROL_IDS.cornerRadius],
    fillOpacity: values[BAR_POSITION_CONTROL_IDS.fillOpacity],
    strokeWidth: values[BAR_POSITION_CONTROL_IDS.strokeWidth],
    gap: values[BAR_POSITION_CONTROL_IDS.gap],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
