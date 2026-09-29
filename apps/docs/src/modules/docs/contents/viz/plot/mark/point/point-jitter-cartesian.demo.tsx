import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './point-jitter-cartesian.controls';
import { PointJitterCartesianPreview } from './point-jitter-cartesian.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PointJitterCartesianPreview(values),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 在分类 x role 的实时 step 内散布 Point */
const Demo: FC = controlledPreview.Component;

export default Demo;
