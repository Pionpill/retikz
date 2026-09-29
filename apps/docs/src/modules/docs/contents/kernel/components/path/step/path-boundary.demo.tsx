import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathBoundaryControls, previewControlContract } from './path-boundary.controls';
import { PathBoundaryPreview } from './path-boundary.preview';

export const previewControls = pathBoundaryControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PathBoundaryPreview({
    fit: values.fit,
    gap: values.gap,
    boundary: values.boundary,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * 端点 boundary：单边覆盖
 * @description 固定一条边，在面板切换目标端点的视觉轮廓 / 圆形连接面，并调整 fit 与 gap
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
