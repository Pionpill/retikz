import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './annotation-data-interval.controls';
import { AnnotationDataIntervalPreview } from './annotation-data.preview';

const preview = defineControlledPreview(previewControlContract, values => AnnotationDataIntervalPreview(values));
/** 稳定源码状态 */
export const previewSource = preview.source;
/** 数据绑定控件 */
export const previewControls = previewControlContract.controls;
/** 数据绑定示例 */
const AnnotationDataInterval: FC = preview.Component;
export default AnnotationDataInterval;
