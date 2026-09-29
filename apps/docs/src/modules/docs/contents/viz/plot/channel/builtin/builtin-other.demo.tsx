import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { builtinOtherControls, previewControlContract } from './builtin-other.controls';
import { BuiltinOtherPreview } from './builtin-other.preview';

/** 注册回退使用的其他通道数据面板 */
export const previewControls = builtinOtherControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  BuiltinOtherPreview({
    pointZIndex: values.pointZIndex,
    orderEnabled: values.orderEnabled,
    seriesEnabled: values.seriesEnabled,
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 排序、系列拆分与绘制顺序 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
