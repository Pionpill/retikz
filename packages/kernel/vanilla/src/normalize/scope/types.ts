import type { AnchorValue, IRScope, IRTransform } from '@retikz/core';

import type { InputChild } from '../scene';

/** 作者侧 Scope transform */
export type InputTransform =
  | Exclude<IRTransform, { kind: 'at-translate' }>
  | (Omit<Extract<IRTransform, { kind: 'at-translate' }>, 'direction'> & {
      direction: AnchorValue;
    });

/** 作者侧 Scope 输入 */
export type InputScope = Omit<IRScope, 'type' | 'children' | 'transforms'> & {
  type?: 'scope';
  transforms?: ReadonlyArray<InputTransform>;
  children: ReadonlyArray<InputChild>;
  /** 可选编译驱动自行解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};
