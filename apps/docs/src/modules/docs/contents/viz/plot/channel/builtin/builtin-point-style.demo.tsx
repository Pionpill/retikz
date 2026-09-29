import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { builtinPointStyleControls, previewControlContract } from './builtin-point-style.controls';
import { BuiltinPointStylePreview } from './builtin-point-style.preview';

/** 注册回退使用的点样式 controls */
export const previewControls = builtinPointStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  BuiltinPointStylePreview({
    paintChannel: values.paintChannel,
    paint: values.paint,
    strokeWidth: values.strokeWidth,
    opacity: values.opacity,
    fillOpacity: values.fillOpacity,
    strokeOpacity: values.strokeOpacity,
    size: values.size,
    shape: values.shape,
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 点颜色、透明度、大小与形状 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
