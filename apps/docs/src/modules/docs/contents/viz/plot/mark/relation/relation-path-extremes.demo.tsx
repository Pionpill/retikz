import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, relationPathExtremesControls } from './relation-path-extremes.controls';
import { RelationPathExtremesPreview } from './relation-path-extremes.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  RelationPathExtremesPreview(values),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = relationPathExtremesControls;

const Demo: FC = controlledPreview.Component;

export default Demo;
