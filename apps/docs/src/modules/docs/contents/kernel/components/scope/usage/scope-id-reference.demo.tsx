import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scopeIdReferenceControls } from './scope-id-reference.controls';
import { ScopeIdReferencePreview } from './scope-id-reference.preview';

/** controls registry 未刷新时供 ComponentPreview 从 demo 模块直接解析的兜底定义 */
export const previewControls = scopeIdReferenceControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ScopeIdReferencePreview({
    boundingShape: values.boundingShape,
    anchor: values.anchor,
    angleDegrees: values.angleDegrees,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * Scope 整体引用与输出边界 playground
 * @description 外部 source 只连接 scope.id 生成的整体目标；面板切换 synthetic 包络形状和命名 / 数字角度 anchor，不改变 children
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
