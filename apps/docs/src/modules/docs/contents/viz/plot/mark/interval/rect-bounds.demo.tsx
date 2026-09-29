import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  RECT_BOUNDS_COORDINATE_ID,
  RECT_BOUNDS_MODE_ID,
  RECT_BOUNDS_SHOW_COLOR_ID,
} from './rect-bounds.controls';
import { RectBoundsPreview } from './rect-bounds.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  RectBoundsPreview({
    coordinate: values[RECT_BOUNDS_COORDINATE_ID],
    showColor: values[RECT_BOUNDS_SHOW_COLOR_ID],
    mode: values[RECT_BOUNDS_MODE_ID],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
