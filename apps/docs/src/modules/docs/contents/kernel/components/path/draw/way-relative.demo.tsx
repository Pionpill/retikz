import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, wayRelativeControls } from './way-relative.controls';
import { WayRelativePreview } from './way-relative.preview';

export const previewControls = wayRelativeControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  WayRelativePreview({
    offset: values.offset,
  }),
);

export const previewSource = controlledPreview.source;

/** 同屏对照 Relative 沿用基准与 Accumulate 推进基准 */
const Demo: FC = controlledPreview.Component;

export default Demo;
