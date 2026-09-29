import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { builtinPathStyleControls, previewControlContract } from './builtin-path-style.controls';
import { BuiltinPathStylePreview } from './builtin-path-style.preview';

/** 注册回退使用的路径样式 controls */
export const previewControls = builtinPathStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  BuiltinPathStylePreview({
    dashMode: values.dashMode,
    stroke: values.stroke,
    strokeWidth: values.strokeWidth,
    opacity: values.opacity,
    lineCap: values.lineCap,
    lineJoin: values.lineJoin,
    roundedCorners: values.roundedCorners,
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 路径描边、端点与连接样式 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
