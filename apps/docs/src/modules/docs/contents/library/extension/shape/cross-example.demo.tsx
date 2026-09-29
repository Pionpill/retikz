import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { crossExampleControls, previewControlContract } from './cross-example.controls';
import { renderCrossExamplePreview } from './cross-example.preview';

export const previewControls = crossExampleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderCrossExamplePreview({
    horizontalWidth: values.horizontalWidth,
    verticalWidth: values.verticalWidth,
    topHeight: values.topHeight,
    rightHeight: values.rightHeight,
    bottomHeight: values.bottomHeight,
    leftHeight: values.leftHeight,
    fill: values.fill,
  }),
);

export const previewSource = controlledPreview.source;

/** 调整 Cross 的外接尺寸与填充 */
const Demo: FC = controlledPreview.Component;

export default Demo;
