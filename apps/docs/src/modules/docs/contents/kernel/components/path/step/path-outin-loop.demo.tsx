import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathOutInLoopControls, previewControlContract } from './path-outin-loop.controls';
import { PathOutinLoopPreview } from './path-outin-loop.preview';

export const previewControls = pathOutInLoopControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PathOutinLoopPreview({
    mode: values.mode,
    loopLooseness: values.loopLooseness,
    looseness: values.looseness,
    outAngle: values.outAngle,
    inAngle: values.inAngle,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * out/in 出入射角与自环 playground
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
