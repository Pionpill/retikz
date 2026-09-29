import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { hexagonExampleControls, previewControlContract } from './hexagon-example.controls';
import { renderHexagonExamplePreview } from './hexagon-example.preview';

export const previewControls = hexagonExampleControls;
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderHexagonExamplePreview({
    shoulderDepth: values.shoulderDepth,
    cornerRadius: values.cornerRadius,
  }),
);
export const previewSource = controlledPreview.source;
/** 固定 Hexagon 并调整其固定肩深与圆角参数 */
const Demo: FC = controlledPreview.Component;
export default Demo;
