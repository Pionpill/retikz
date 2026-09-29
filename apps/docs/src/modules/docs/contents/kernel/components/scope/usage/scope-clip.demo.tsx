import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scopeClipControls } from './scope-clip.controls';
import { ScopeClipPreview } from './scope-clip.preview';

/** controls registry 未刷新时供 ComponentPreview 从 demo 模块直接解析的兜底定义 */
export const previewControls = scopeClipControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ScopeClipPreview({
    clipKind: values.clipKind,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * Scope clip 类型 playground
 * @description 面板切换一种 Core clip 与五种 Standard clip，同一块网格内容只露出当前 Scope 局部裁剪区内的部分
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
