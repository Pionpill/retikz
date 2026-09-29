import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scopeTranslateBasicControls } from './scope-translate-basic.controls';
import { ScopeTranslateBasicPreview } from './scope-translate-basic.preview';

/** controls registry 未刷新时供 ComponentPreview 从 demo 模块直接解析的兜底定义 */
export const previewControls = scopeTranslateBasicControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => ScopeTranslateBasicPreview(values));

export const previewSource = controlledPreview.source;

/**
 * Scope 局部坐标 playground
 * @description O / T 是 Scope 外的固定参照点；偏心方形 Q 提供固有包络，小圆点只标记局部原点
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
