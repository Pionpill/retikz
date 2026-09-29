import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { CUSTOM_MARK_CONTROL_IDS, customMarkControls, previewControlContract } from './mark-custom.controls';
import { MarkCustomPreview } from './mark-custom.preview';

/**
 * 自定义图元：每行投影成一个 diamond glyph。
 * @description type='diamond' 是非内置判别串；collectFields 登记读取的源字段；lower 拿到坐标系 frame，
 *   把每行的 x/y 经 frame.projectRoles 投成屏幕点，再装配 core Node（diamond shape）。
 */
// 自定义图元没有专属 React 组件，经 spec 入口创作：marks 里写 { type: 'diamond', ... }，运行时由 markDefinitions 解释。
/** controls registry 缺失时使用的显式回退 */
export const previewControls = customMarkControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  MarkCustomPreview({
    size: values[CUSTOM_MARK_CONTROL_IDS.size],
    fill: values[CUSTOM_MARK_CONTROL_IDS.fill],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
