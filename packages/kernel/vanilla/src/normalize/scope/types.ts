import type { AnchorValue, IRScope, IRTransform } from '@retikz/core';

import type { InputChild } from '../scene';

/** 作者侧 Scope transform */
export type InputTransform =
  | Exclude<IRTransform, { kind: 'at-translate' }>
  | (Omit<Extract<IRTransform, { kind: 'at-translate' }>, 'direction'> & {
      direction: AnchorValue;
    });

/** 作者侧 Scope 输入的公共字段 */
type InputScopeBase = Omit<IRScope, 'type' | 'children' | 'transforms'> & {
  children: ReadonlyArray<InputChild>;
  /** 可选编译驱动自行解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};

/** 作者侧 Scope 输入 */
export type InputScope = InputScopeBase & {
  /** 无法由 authoring 字段唯一识别时显式指定 Scope 类别 */
  type?: 'scope';
  transforms?: ReadonlyArray<InputTransform>;
};
