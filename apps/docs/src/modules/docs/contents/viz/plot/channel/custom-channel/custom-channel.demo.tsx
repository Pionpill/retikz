import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { CUSTOM_CHANNEL_CONTROL_IDS, customChannelControls, previewControlContract } from './custom-channel.controls';
import { CustomChannelPreview } from './custom-channel.preview';

/** controls registry 缺失时使用的显式回退 */
export const previewControls = customChannelControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CustomChannelPreview({
    bindingMode: values[CUSTOM_CHANNEL_CONTROL_IDS.bindingMode],
    constantIntensity: values[CUSTOM_CHANNEL_CONTROL_IDS.constantIntensity],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
