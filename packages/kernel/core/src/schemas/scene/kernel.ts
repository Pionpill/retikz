import type { IRCoordinate } from '../node/coordinate';
import type { IRNode } from '../node/node';
import type { IRPathBase } from '../path/path';
import type { IRScope } from '../scope/scope';
import type { IRScene } from './scene';

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
