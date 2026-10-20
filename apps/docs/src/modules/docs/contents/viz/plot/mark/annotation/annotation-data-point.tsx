import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './annotation-data-point.controls';
import { AnnotationDataPointPreview } from './annotation-data.preview';

const preview = defineControlledPreview(previewControlContract, values => AnnotationDataPointPreview(values));
/** 稳定源码状态 */
export const previewSource = preview.source;
/** 数据绑定控件 */
export const previewControls = previewControlContract.controls;
/** 数据绑定示例 */
const AnnotationDataPoint: FC = preview.Component;
export default AnnotationDataPoint;
