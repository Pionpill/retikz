import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { animationPlaygroundControls, previewControlContract } from './animation-playground.controls';
import { AnimationPlaygroundPreview } from './animation-playground.preview';

export const previewControls = animationPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  AnimationPlaygroundPreview({
    from: values.from,
    duration: values.duration,
    delay: values.delay,
    easing: values.easing,
    origin: values.origin,
  }),
);

export const previewSource = controlledPreview.source;

/** 固定一个 scaleIn，让面板集中探索专有项、公共时序与支点 */
const Demo: FC = controlledPreview.Component;

export default Demo;
