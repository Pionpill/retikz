import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { builtinNodeTextControls, previewControlContract } from './builtin-node-text.controls';
import { BuiltinNodeTextPreview } from './builtin-node-text.preview';

/** 注册回退使用的节点与文本 controls */
export const previewControls = builtinNodeTextControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  BuiltinNodeTextPreview({
    padding: values.padding,
    cornerRadius: values.cornerRadius,
    rotate: values.rotate,
    minimumSize: values.minimumSize,
    scale: values.scale,
    showLabel: values.showLabel,
    labelPosition: values.labelPosition,
    labelDistance: values.labelDistance,
    labelPin: values.labelPin,
    labelTextColor: values.labelTextColor,
    shadow: values.shadow,
    blendMode: values.blendMode,
    textColor: values.textColor,
    align: values.align,
    fontSize: values.fontSize,
    lineHeight: values.lineHeight,
    maxTextWidth: values.maxTextWidth,
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 节点几何、文本、标签与效果 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
