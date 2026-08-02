import type { ValueOf } from '@retikz/core';

import type { LabPolicy, LabScenario } from './model';

import { LabChangeKind, LabPolicyId } from './model';

/** Kernel Performance Lab 稳定场景标识 */
export const KernelLabScenarioId = {
  DenseNodeGrid: 'dense-node-grid',
  MixedPrimitives: 'mixed-primitives',
  ComplexPaths: 'complex-paths',
  NodeDrag: 'node-drag',
  NodeSelection: 'node-selection',
  NodeInsertRemove: 'node-insert-remove',
} as const;

/** Kernel Performance Lab 稳定场景标识取值 */
export type KernelLabScenarioIdValue = ValueOf<typeof KernelLabScenarioId>;

/** 带稳定 ID 约束的 Kernel Performance Lab 场景 */
export type KernelLabScenario = Omit<LabScenario, 'id'> & Readonly<{ id: KernelLabScenarioIdValue }>;

/** Kernel Performance Lab 固定比较的三种策略 */
export const kernelLabPolicies: ReadonlyArray<LabPolicy> = Object.freeze([
  Object.freeze({
    id: LabPolicyId.StaticFull,
    label: 'Static · Full',
    description: '每次更新重新编译并完整绘制，作为稳定对照组',
  }),
  Object.freeze({
    id: LabPolicyId.RetainedFull,
    label: 'Retained · Full',
    description: '保留 renderer 生命周期，但强制执行完整更新',
  }),
  Object.freeze({
    id: LabPolicyId.RetainedAuto,
    label: 'Retained · Auto',
    description: '由 Runtime 根据 snapshot diff 与 Scene Patch 自动选择增量更新',
  }),
]);

/** Kernel Performance Lab 常见稳定场景 */
export const kernelLabScenarios: ReadonlyArray<KernelLabScenario> = Object.freeze([
  Object.freeze({
    id: KernelLabScenarioId.DenseNodeGrid,
    label: '密集节点网格',
    description: '完整更新 5,000 个规则排列的节点样式',
    entityCount: 5_000,
    changedEntities: 5_000,
    changeKind: LabChangeKind.AllStyle,
  }),
  Object.freeze({
    id: KernelLabScenarioId.MixedPrimitives,
    label: '混合图元',
    description: '完整更新 3,000 个普通节点、文本节点与路径的样式',
    entityCount: 3_000,
    changedEntities: 3_000,
    changeKind: LabChangeKind.AllStyle,
  }),
  Object.freeze({
    id: KernelLabScenarioId.ComplexPaths,
    label: '复杂路径',
    description: '完整更新 1,000 条包含多段直线与三次贝塞尔曲线的路径',
    entityCount: 1_000,
    changedEntities: 1_000,
    changeKind: LabChangeKind.AllStyle,
  }),
  Object.freeze({
    id: KernelLabScenarioId.NodeDrag,
    label: '节点拖动',
    description: '在 5,000 个稳定节点中只移动一个节点',
    entityCount: 5_000,
    changedEntities: 1,
    changeKind: LabChangeKind.SinglePosition,
  }),
  Object.freeze({
    id: KernelLabScenarioId.NodeSelection,
    label: '节点选中状态',
    description: '在 5,000 个稳定节点中只修改一个节点的选中样式',
    entityCount: 5_000,
    changedEntities: 1,
    changeKind: LabChangeKind.SingleStyle,
  }),
  Object.freeze({
    id: KernelLabScenarioId.NodeInsertRemove,
    label: '节点增删',
    description: '在 5,000 个稳定节点中删除一个节点并插入一个节点',
    entityCount: 5_000,
    changedEntities: 2,
    changeKind: LabChangeKind.InsertRemove,
  }),
]);

/** Performance Lab 默认选择的 Kernel 场景 */
export const defaultKernelLabScenarioId = KernelLabScenarioId.DenseNodeGrid;

/** 按稳定 ID 读取 Kernel 场景 */
export const getKernelLabScenario = (id: string): KernelLabScenario => {
  const scenario = kernelLabScenarios.find(candidate => candidate.id === id);
  if (scenario === undefined) throw new Error(`unknown Kernel Lab scenario: ${id}`);
  return scenario;
};
