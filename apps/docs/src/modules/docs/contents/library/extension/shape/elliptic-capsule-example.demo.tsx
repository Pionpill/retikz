import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { ellipticCapsuleExampleControls, previewControlContract } from './elliptic-capsule-example.controls';
import { renderEllipticCapsuleExamplePreview } from './elliptic-capsule-example.preview';

export const previewControls = ellipticCapsuleExampleControls;
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderEllipticCapsuleExamplePreview({
    axis: values.axis,
    capDepth: values.capDepth,
  }),
);
export const previewSource = controlledPreview.source;
/** 固定 Elliptic Capsule 并调整其专有几何参数 */
const Demo: FC = controlledPreview.Component;
export default Demo;
