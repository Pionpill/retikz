import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { INTERVAL_SECTOR_CONTROL_IDS, previewControlContract } from './interval-sector.controls';
import { IntervalSectorPreview } from './interval-sector.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  IntervalSectorPreview({
    pullDistance: values[INTERVAL_SECTOR_CONTROL_IDS.pullDistance],
    showLabels: values[INTERVAL_SECTOR_CONTROL_IDS.showLabels],
    innerRadius: values[INTERVAL_SECTOR_CONTROL_IDS.innerRadius],
    padAngle: values[INTERVAL_SECTOR_CONTROL_IDS.padAngle],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
