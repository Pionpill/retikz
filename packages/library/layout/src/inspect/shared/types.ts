import type { IRJsonObject } from '@retikz/core';
import type { InspectionSelection, InspectionSelectionTarget, InspectorKey } from '@retikz/inspect';
import type { input as ZodInput, output as ZodOutput } from 'zod';

import type { BaseLayoutInspectOptionsInputSchema, BaseLayoutInspectOptionsSchema } from './schema';

/** 通用布局检查器的输入选项 */
export type BaseLayoutInspectOptions = ZodInput<typeof BaseLayoutInspectOptionsInputSchema>;

/** 完整解析后的通用布局检查器选项 */
export type ResolvedBaseLayoutInspectOptions = ZodOutput<typeof BaseLayoutInspectOptionsSchema>;

/** Layout 布局检查器选择策略的作用范围 */
export type LayoutInspectionSelectionScope = InspectionSelectionTarget;

/** 构造一个布局检查器选择结果所需的输入 */
export type CreateLayoutInspectionSelectionInput<TOptions extends IRJsonObject = BaseLayoutInspectOptions> = Readonly<{
  /** 目标检查器的注册键 */
  inspector: InspectorKey;
  /** 整张图、子树或组件自身 */
  target: LayoutInspectionSelectionScope;
  /** 稀疏选项；true 使用默认值，false 关闭当前范围 */
  options: false | true | TOptions;
}>;

/** 可直接交给编译驱动的 Layout 布局检查器选择结果 */
export type LayoutInspectionSelection = InspectionSelection;
