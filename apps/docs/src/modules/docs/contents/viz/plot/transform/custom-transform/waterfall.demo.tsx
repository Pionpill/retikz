import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, waterfallControls } from './waterfall.controls';
import { WaterfallPreview } from './waterfall.preview';

/** controls registry 缺失时使用的显式回退 */
export const previewControls = waterfallControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => WaterfallPreview(values));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
