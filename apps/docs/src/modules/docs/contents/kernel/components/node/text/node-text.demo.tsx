import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeTextControls, previewControlContract } from './node-text.controls';
import { NodeTextPreview } from './node-text.preview';

export const previewControls = nodeTextControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  NodeTextPreview({
    content: values.content,
    firstFill: values.firstFill,
    secondFill: values.secondFill,
    restFill: values.restFill,
    firstOpacity: values.firstOpacity,
    secondOpacity: values.secondOpacity,
    restOpacity: values.restOpacity,
    firstEmphasis: values.firstEmphasis,
    secondEmphasis: values.secondEmphasis,
    restEmphasis: values.restEmphasis,
    shape: values.shape,
    align: values.align,
    maxTextWidth: values.maxTextWidth,
    lineHeight: values.lineHeight,
  }),
);

export const previewSource = controlledPreview.source;

/** Node 多行内容、自动换行与行级样式 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
