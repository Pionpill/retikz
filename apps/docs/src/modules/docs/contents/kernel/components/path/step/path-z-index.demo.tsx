import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathZIndexControls, previewControlContract } from './path-z-index.controls';
import { PathZIndexPreview } from './path-z-index.preview';

export const previewControls = pathZIndexControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PathZIndexPreview({
    zIndex: values.zIndex,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * Path zIndex 显式栈序
 * @description 固定两个重叠矩形，通过面板改变先声明的蓝色 Path 的 zIndex
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
