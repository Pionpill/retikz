import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { builtinPositionControls, previewControlContract } from './builtin-position.controls';
import { BuiltinPositionPreview } from './builtin-position.preview';

/** 注册回退使用的内置位置通道 controls */
export const previewControls = builtinPositionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  BuiltinPositionPreview({
    xField: values.xField,
    yField: values.yField,
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 可切换横纵轴字段的内置位置通道试验场 */
const Demo: FC = controlledPreview.Component;

export default Demo;
