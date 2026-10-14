import type { IRCoordinate } from './coordinate';
import type { IRNode } from './node';
import type { IRPathBase } from './path';
import type { IRScene } from './scene';
import type { IRScope } from './scope';

/** 不包含 composite 的 Tier 1 scope */
export type IRKernelScope = Omit<IRScope, 'children'> & {
  /** 只包含 Tier 1 的递归子节点 */
  children: Array<IRKernelChild>;
};

/** 不包含 composite 的 Tier 1 child */
export type IRKernelChild = IRNode | IRPathBase | IRCoordinate | IRKernelScope;

/** 可由 Kernel adapter 直接消费的 Tier 1 IR scene */
export type IRKernelScene = Omit<IRScene, 'children'> & {
  /** 只包含 Tier 1 的顶层子节点 */
  children: Array<IRKernelChild>;
};
