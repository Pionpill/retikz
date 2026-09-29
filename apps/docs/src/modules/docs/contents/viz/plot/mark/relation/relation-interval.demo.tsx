import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, relationIntervalControls } from './relation-interval.controls';
import { RelationIntervalPreview } from './relation-interval.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values => RelationIntervalPreview(values));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = relationIntervalControls;

const Demo: FC = controlledPreview.Component;

export default Demo;
