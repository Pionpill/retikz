import type { IRScope } from '@retikz/core';

import type { InputScene } from '../scene';

/** 作者侧 Scope 输入 */
export type InputScope = Omit<IRScope, 'children'> & {
  /** 当前作用域内按声明顺序处理的子图元 */
  children: InputScene['children'];
  /** 归一化时保留的作者元数据，不进入 Core IR */
  authoring?: unknown;
};
