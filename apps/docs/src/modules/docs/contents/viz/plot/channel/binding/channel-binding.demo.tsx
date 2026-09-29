import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { channelBindingControls, previewControlContract } from './channel-binding.controls';
import { ChannelBindingPreview } from './channel-binding.preview';

/** 注册回退使用的通道绑定 controls */
export const previewControls = channelBindingControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ChannelBindingPreview({
    xField: values.xField,
    yField: values.yField,
    colorSource: values.colorSource,
    sizeSource: values.sizeSource,
    shapeSource: values.shapeSource,
    showLabel: values.showLabel,
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 可切换字段与常量来源的通道绑定 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
