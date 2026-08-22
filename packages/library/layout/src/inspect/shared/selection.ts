import type { IRJsonObject } from '@retikz/core';
import type { InspectionSelectionRule } from '@retikz/inspect';

import type { CreateLayoutInspectionSelectionInput, LayoutInspectionSelection } from './types';

/** 为整张图、作用域子树或组件自身创建一个布局检查请求 */
export const createLayoutInspectionSelection = <TOptions extends IRJsonObject>(
  input: CreateLayoutInspectionSelectionInput<TOptions>,
): LayoutInspectionSelection =>
  Object.freeze({
    rules: Object.freeze([
      Object.freeze({ kind: 'request', inspector: input.inspector, target: input.target, options: input.options }),
    ] satisfies Array<InspectionSelectionRule>),
  });

/** 为整张图或作用域子树创建阻止全部检查器的边界 */
export const createLayoutInspectionBarrier = (
  target: Readonly<{ kind: 'scene' }> | Readonly<{ kind: 'subtree'; sourcePath: string }>,
): LayoutInspectionSelection => Object.freeze({ rules: Object.freeze([Object.freeze({ kind: 'barrier', target })]) });
