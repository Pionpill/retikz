import type { BenchModuleIdValue } from './module-registry';
import type { BenchTestCase } from './test-catalog';

import { getModuleTestCases } from './test-catalog';

/** 左侧导航中的可运行测试集 */
export type BenchTestSuite = BenchTestCase;

/** 返回指定模块已经接入真实执行器的测试集 */
export const getModuleTestSuites = (moduleId: BenchModuleIdValue): ReadonlyArray<BenchTestSuite> =>
  getModuleTestCases(moduleId);
