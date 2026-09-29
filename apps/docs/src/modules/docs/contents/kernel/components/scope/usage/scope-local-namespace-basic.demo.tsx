import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scopeLocalNamespaceBasicControls } from './scope-local-namespace-basic.controls';
import { ScopeLocalNamespaceBasicPreview } from './scope-local-namespace-basic.preview';

/** controls registry 未刷新时供 ComponentPreview 从 demo 模块直接解析的兜底定义 */
export const previewControls = scopeLocalNamespaceBasicControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ScopeLocalNamespaceBasicPreview({
    nodeId: values.nodeId,
    localNamespace: values.localNamespace,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * localNamespace 基础隔离 playground
 * @description 外层 Node 固定使用 id="A"；面板调整内部 Node id 与 localNamespace，观察外层引用是否被同名内部节点覆盖
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
