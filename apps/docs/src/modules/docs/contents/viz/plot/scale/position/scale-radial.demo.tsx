import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleRadialControls } from './scale-radial.controls';
import { ScaleRadialPreview } from './scale-radial.preview';

/** 注册回退使用的径向位置比例尺 controls */
export const previewControls = scaleRadialControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ScaleRadialPreview({
    dataPreset: values.dataPreset,
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 并排比较同一数据在半径线性与面积线性下的极坐标构图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
