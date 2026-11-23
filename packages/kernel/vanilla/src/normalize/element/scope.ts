import type { IRScope } from '@retikz/core';

import type { InputScene } from '../scene';

/** 作者侧 Scope 输入 */
export type InputScope = Omit<IRScope, 'children'> & {
  /** 当前作用域内按声明顺序处理的子图元 */
  children: InputScene['children'];
  /** 可选编译结果扩展自行解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};
