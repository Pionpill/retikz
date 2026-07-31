import type { ValueOf } from '@retikz/core';

/** Bench 可承载的产品模块 */
export const BenchModuleId = {
  Core: 'core',
  Plot: 'plot',
  Table: 'table',
} as const;

/** Bench 可承载的产品模块取值 */
export type BenchModuleIdValue = ValueOf<typeof BenchModuleId>;

/** 模块切换器中的模块描述 */
export type BenchModule = Readonly<{
  id: BenchModuleIdValue;
  label: string;
  description: string;
  available: boolean;
}>;

/** 左侧导航中的可运行测试集 */
export type BenchTestSuite = Readonly<{
  id: string;
  moduleId: BenchModuleIdValue;
  group: string;
  label: string;
  description: string;
  scenarioId: string;
}>;

/** Bench 长期支持的模块入口；没有真实测试集的模块保持不可选 */
export const benchModules: ReadonlyArray<BenchModule> = Object.freeze([
  Object.freeze({ id: BenchModuleId.Core, label: 'Core', description: 'Kernel runtime & renderer', available: true }),
  Object.freeze({ id: BenchModuleId.Plot, label: 'Plot', description: 'Viz plots', available: false }),
  Object.freeze({ id: BenchModuleId.Table, label: 'Table', description: 'Table layout', available: false }),
]);

const testSuites: ReadonlyArray<BenchTestSuite> = Object.freeze([
  Object.freeze({
    id: 'core-single-entity-update',
    moduleId: BenchModuleId.Core,
    group: 'Runtime updates',
    label: '单实体更新',
    description: '5,000 个稳定实体中修改一个节点',
    scenarioId: 'single-entity-update',
  }),
]);

/** 返回指定模块已经接入真实执行器的测试集 */
export const getModuleTestSuites = (moduleId: BenchModuleIdValue): ReadonlyArray<BenchTestSuite> =>
  Object.freeze(testSuites.filter(suite => suite.moduleId === moduleId));
