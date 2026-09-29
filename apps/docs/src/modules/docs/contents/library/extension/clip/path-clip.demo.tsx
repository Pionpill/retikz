import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathClipControls, previewControlContract } from './path-clip.controls';
import { renderPathClipPreview } from './path-clip.preview';

export const previewControls = pathClipControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderPathClipPreview({
    fillRule: values.fillRule,
    halfHeight: values.halfHeight,
    tipX: values.tipX,
    notchX: values.notchX,
    holeSize: values.holeSize,
  }),
);

export const previewSource = controlledPreview.source;

/** 固定路径命令结构，并调整命令坐标与填充规则 */
const Demo: FC = controlledPreview.Component;

export default Demo;
