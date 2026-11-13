import type { IRScene } from '@retikz/core';
import type { WeaveBatch, WeaveOperation } from '@retikz/reconciler';

/** 只包含 Weave 批次接受的基础元素；不把 Composite 混入计数和插入输入 */
export type UpdateBenchmarkScene = Omit<IRScene, 'children'> & {
  children: Extract<WeaveOperation, { kind: 'insert' }>['elements'];
};

/** 一对确定性场景及 A→B、B→A 批次；期望场景独立构造，不由批次执行器生成 */
export type UpdateBenchmarkWorkload = {
  states: readonly [UpdateBenchmarkScene, UpdateBenchmarkScene];
  batches: (rootId: string) => readonly [WeaveBatch, WeaveBatch];
  change: 'real' | 'equal' | 'empty';
  changedElements: number;
};

/** 一项特征变化的增量工作负载 */
export type UpdateBenchmarkCase = {
  kind: string;
  label: string;
  create: (count: number) => UpdateBenchmarkWorkload;
};

/** 将完整场景与独立的批次操作组合；批次中的 input 由调用者给出 */
export const createUpdateWorkload = (
  states: UpdateBenchmarkWorkload['states'],
  operations: (rootId: string) => readonly [Array<WeaveOperation>, Array<WeaveOperation>],
  changedElements: number,
  change: UpdateBenchmarkWorkload['change'] = 'real',
): UpdateBenchmarkWorkload => ({
  states,
  batches: rootId => {
    const [forward, backward] = operations(rootId);
    return [{ operations: forward }, { operations: backward }];
  },
  changedElements,
  change,
});

/** 固定版本的基础场景，不参与任何计时 */
export const createUpdateScene = (children: UpdateBenchmarkScene['children']): UpdateBenchmarkScene => ({
  type: 'scene',
  version: 1,
  children,
});

/** 完整自身输入更新；Scope 调用方必须移除 children */
export const updateChild = (
  rootId: string,
  index: number,
  input: Extract<WeaveOperation, { kind: 'update' }>['input'],
): WeaveOperation => ({ kind: 'update', target: { kind: 'child', scopeId: rootId, index }, input });

/** 实际作者元素数，包含 Scope 与支撑节点，不把主体规模当成总元素数 */
export const countSceneElements = (scene: UpdateBenchmarkScene): number => {
  const count = (children: UpdateBenchmarkScene['children']): number =>
    children.reduce((total, child) => total + 1 + (child.type === 'scope' ? count(child.children) : 0), 0);
  return count(scene.children);
};
