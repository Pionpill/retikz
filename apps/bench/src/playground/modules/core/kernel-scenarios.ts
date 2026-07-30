import type { LabPolicy, LabScenario } from './model';

import { LabPolicyId, LabUpdateKind } from './model';

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

/** Kernel Performance Lab 首版稳定场景 */
export const kernelLabScenarios: ReadonlyArray<LabScenario> = Object.freeze([
  Object.freeze({
    id: 'single-entity-update',
    label: '单实体更新',
    description: '在 5,000 个稳定节点中只修改一个节点的 fill',
    entityCount: 5_000,
    changedEntities: 1,
    updateKind: LabUpdateKind.Entity,
  }),
]);

/** Performance Lab 默认选择的 Kernel 场景 */
export const defaultKernelLabScenarioId = 'single-entity-update';

/** 按稳定 ID 读取 Kernel 场景 */
export const getKernelLabScenario = (id: string): LabScenario => {
  const scenario = kernelLabScenarios.find(candidate => candidate.id === id);
  if (scenario === undefined) throw new Error(`unknown Kernel Lab scenario: ${id}`);
  return scenario;
};
