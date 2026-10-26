import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { markPlacementControls, previewControlContract } from './mark-placement.controls';
import { MarkPlacementPreview } from './mark-placement.preview';

/** 预览器使用的默认控件 */
export const previewControls = markPlacementControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <MarkPlacementPreview {...values} />
));

/** 源码视图与交互预览共用的渲染入口 */
export const previewSource = controlledPreview.source;

/** 标记放置交互预览 */
const Demo: FC = controlledPreview.Component;

export default Demo;
