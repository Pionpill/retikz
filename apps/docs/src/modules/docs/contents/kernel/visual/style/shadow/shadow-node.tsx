import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './shadow-node.controls';
import { ShadowNodePreview } from './shadow-node.preview';

/** 宿主控件注册回退 */
export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ShadowNodePreview({
    enabled: values.enabled,
    offsetX: values.offsetX,
    offsetY: values.offsetY,
    blur: values.blur,
    color: values.color,
    opacity: values.opacity,
  }),
);

/** 与实时预览共用的源码状态 */
export const previewSource = controlledPreview.source;

/** 阴影边界交互示例 */
const ShadowDemo: FC = controlledPreview.Component;
export default ShadowDemo;
