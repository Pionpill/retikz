import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, wayFoldControls } from './way-fold.controls';
import { WayFoldPreview } from './way-fold.preview';

export const previewControls = wayFoldControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  WayFoldPreview({
    direction: values.direction,
    fraction: values.fraction,
  }),
);

export const previewSource = controlledPreview.source;

/** 用固定端点和投影拐点展示 Way 折角方向 */
const Demo: FC = controlledPreview.Component;

export default Demo;
