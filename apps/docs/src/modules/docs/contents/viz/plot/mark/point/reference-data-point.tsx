import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { AnnotationDataPointPreview } from '../shared/reference-data.preview';
import { previewControlContract } from './reference-data-point.controls';

const preview = defineControlledPreview(previewControlContract, values => AnnotationDataPointPreview(values));
/** 稳定源码状态 */
export const previewSource = preview.source;
/** 数据绑定控件 */
export const previewControls = previewControlContract.controls;
/** 数据绑定示例 */
const AnnotationDataPoint: FC = preview.Component;
export default AnnotationDataPoint;
