import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { POINT_TEXT_CONTROL_IDS, previewControlContract } from './point-text.controls';
import { PointTextPreview } from './point-text.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PointTextPreview({
    textColor: values[POINT_TEXT_CONTROL_IDS.textColor],
    fontSize: values[POINT_TEXT_CONTROL_IDS.fontSize],
    fontBold: values[POINT_TEXT_CONTROL_IDS.fontBold],
    mode: values[POINT_TEXT_CONTROL_IDS.mode],
    labelPosition: values[POINT_TEXT_CONTROL_IDS.labelPosition],
    labelDistance: values[POINT_TEXT_CONTROL_IDS.labelDistance],
    labelPin: values[POINT_TEXT_CONTROL_IDS.labelPin],
    dx: values[POINT_TEXT_CONTROL_IDS.dx],
    dy: values[POINT_TEXT_CONTROL_IDS.dy],
    coordinate: values[POINT_TEXT_CONTROL_IDS.coordinate],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 切换点标签与文本点并调整对应位置参数 */
const Demo: FC = controlledPreview.Component;

export default Demo;
