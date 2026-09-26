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
  /** 当前作用域内按声明顺序处理的子图元 */
  children: ReadonlyArray<InputChild>;
  /** 可选编译驱动自行解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};

/** 作者侧 Scope 输入 */
export type InputScope = InputScopeBase & {
  /** 无法由 authoring 字段唯一识别时显式指定 Scope 类别 */
  type?: 'scope';
  /** 局部变换列表，最后一项先作用于局部点；省略时不施加局部变换 */
  transforms?: ReadonlyArray<InputTransform>;
};
