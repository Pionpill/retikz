import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { CUSTOM_SCALE_CONTROL_IDS, customScaleControls, previewControlContract } from './scale-custom.controls';
import { ScaleCustomPreview } from './scale-custom.preview';

/** controls registry 缺失时使用的显式回退 */
export const previewControls = customScaleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ScaleCustomPreview({
    exponent: values[CUSTOM_SCALE_CONTROL_IDS.exponent],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
