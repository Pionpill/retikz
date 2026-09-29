import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './point-jitter-polar.controls';
import { PointJitterPolarPreview } from './point-jitter-polar.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values => PointJitterPolarPreview(values));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 在极坐标 angle role 上先抖动角度，再由连续圆弧或离散直弦投影 */
const Demo: FC = controlledPreview.Component;

export default Demo;
