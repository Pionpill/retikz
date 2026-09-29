import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scopeZIndexControls } from './scope-z-index.controls';
import { ScopeZIndexPreview } from './scope-z-index.preview';

/** controls registry 未刷新时供 ComponentPreview 从 demo 模块直接解析的兜底定义 */
export const previewControls = scopeZIndexControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ScopeZIndexPreview({
    scopeA: values.scopeA,
    nodeA1: values.nodeA1,
    nodeA2: values.nodeA2,
    scopeB: values.scopeB,
    nodeB1: values.nodeB1,
    nodeB2: values.nodeB2,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * Scope 与 Node 两级 zIndex playground
 * @description Node zIndex 只在所属 Scope 内排序；Scope zIndex 决定整组 GroupPrim 在父层的上下位置
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
