import type { BenchModuleIdValue } from './constant';

import { BenchModuleId } from './constant';

/** 左侧导航中的可运行测试集 */
export type BenchTestSuite = Readonly<{
  id: string;
  moduleId: BenchModuleIdValue;
  group: string;
  label: string;
  description: string;
  scenarioId: string;
}>;

const testSuites: ReadonlyArray<BenchTestSuite> = Object.freeze([
  Object.freeze({
    id: 'core-single-entity-update',
    moduleId: BenchModuleId.Kernel,
    group: 'Runtime updates',
    label: '单实体更新',
    description: '5,000 个稳定实体中修改一个节点',
    scenarioId: 'single-entity-update',
  }),
]);

/** 返回指定模块已经接入真实执行器的测试集 */
export const getModuleTestSuites = (moduleId: BenchModuleIdValue): ReadonlyArray<BenchTestSuite> =>
  Object.freeze(testSuites.filter(suite => suite.moduleId === moduleId));
