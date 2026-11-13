import type { ValueOf } from '@retikz/foundation';

import type { WeaveNode } from '../shared';

/** 候选执行的就绪边界，局部布局与世界投影分别完成 */
export const WeaveTaskPhase = {
  Prepare: 'prepare',
  Compile: 'compile',
  Project: 'project',
  Output: 'output',
} as const;

export type WeaveTaskPhase = ValueOf<typeof WeaveTaskPhase>;

/** 稳定节点加就绪阶段，不以会随结构修改变化的声明路径作为身份 */
export type WeaveTaskAddress = Readonly<
  | { node: WeaveNode; phase: typeof WeaveTaskPhase.Output }
  | { node: Extract<WeaveNode, { type: 'node' | 'coordinate' | 'path' }>; phase: typeof WeaveTaskPhase.Compile }
  | { node: Extract<WeaveNode, { type: 'scope' | 'composite' }>; phase: typeof WeaveTaskPhase.Prepare }
  | { node: Extract<WeaveNode, { type: 'scope' }>; phase: typeof WeaveTaskPhase.Project }
>;

/** 只在本批存活的执行记录，不保存领域产物或逐节点回调 */
export type WeaveTaskRecord = {
  /** 关联稳定身份与该元素支持的阶段 */
  readonly address: WeaveTaskAddress;
  /** 完成前的重复通知仅归并，不重复调用领域计算 */
  state: 'pending' | 'running' | 'complete';
};
