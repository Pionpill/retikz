import type { ValueOf } from '@retikz/foundation';
import type { LucideIcon } from 'lucide-react';

import { Gauge, MousePointer2, RefreshCw, Sparkles, Zap } from 'lucide-react';

import type { BenchModuleIdValue } from './module-registry';

import { KernelLabScenarioId } from '../modules/kernel';

/** Bench 用例页面类型 */
export const BenchCaseView = {
  Preview: 'preview',
  Benchmark: 'benchmark',
  Reports: 'reports',
} as const;

/** Bench 用例页面类型取值 */
export type BenchCaseViewValue = ValueOf<typeof BenchCaseView>;

/** Bench 用例最近运行状态 */
export const BenchCaseStatus = {
  NotRun: 'not-run',
  Running: 'running',
  Passed: 'passed',
  Warning: 'warning',
  Failed: 'failed',
} as const;

/** Bench 用例最近运行状态取值 */
export type BenchCaseStatusValue = ValueOf<typeof BenchCaseStatus>;

/** Bench 测试用例 */
export type BenchTestCase = Readonly<{
  /** 稳定用例标识 */
  id: string;
  /** 对应执行器场景标识 */
  scenarioId: string;
  /** 用例标题翻译键 */
  title: string;
  /** 用例说明翻译键 */
  description: string;
}>;

/** Bench 测试方向 */
export type BenchTestDirection = Readonly<{
  /** 稳定方向标识 */
  id: string;
  /** 方向标题翻译键 */
  title: string;
  /** 方向图标 */
  icon: LucideIcon;
  /** 方向中的测试用例 */
  cases: ReadonlyArray<BenchTestCase>;
}>;

/** Bench 测试分组 */
export type BenchTestGroup = Readonly<{
  /** 稳定分组标识 */
  id: string;
  /** 分组标题翻译键 */
  title: string;
  /** 分组中的测试方向 */
  directions: ReadonlyArray<BenchTestDirection>;
}>;

/** 用例在测试目录中的完整上下文 */
export type BenchTestCaseContext = Readonly<{
  group: BenchTestGroup;
  direction: BenchTestDirection;
  testCase: BenchTestCase;
}>;

/** 用稳定场景 ID 与翻译键创建目录用例 */
const createTestCase = (id: string, translationKey: string): BenchTestCase =>
  Object.freeze({
    id,
    scenarioId: id,
    title: `catalog.case.${translationKey}.title`,
    description: `catalog.case.${translationKey}.description`,
  });

const denseNodeGrid = createTestCase(KernelLabScenarioId.DenseNodeGrid, 'denseNodeGrid');
const mixedPrimitives = createTestCase(KernelLabScenarioId.MixedPrimitives, 'mixedPrimitives');
const complexPaths = createTestCase(KernelLabScenarioId.ComplexPaths, 'complexPaths');
const nodeDrag = createTestCase(KernelLabScenarioId.NodeDrag, 'nodeDrag');
const nodeSelection = createTestCase(KernelLabScenarioId.NodeSelection, 'nodeSelection');
const nodeInsertRemove = createTestCase(KernelLabScenarioId.NodeInsertRemove, 'nodeInsertRemove');

const moduleGroups: Readonly<Partial<Record<BenchModuleIdValue, ReadonlyArray<BenchTestGroup>>>> = Object.freeze({
  kernel: Object.freeze([
    Object.freeze({
      id: 'performance',
      title: 'catalog.group.performance',
      directions: Object.freeze([
        Object.freeze({
          id: 'full-performance',
          title: 'catalog.direction.fullPerformance',
          icon: Gauge,
          cases: Object.freeze([denseNodeGrid, mixedPrimitives, complexPaths]),
        }),
        Object.freeze({
          id: 'incremental-performance',
          title: 'catalog.direction.incrementalPerformance',
          icon: Zap,
          cases: Object.freeze([nodeDrag, nodeSelection, nodeInsertRemove]),
        }),
        Object.freeze({
          id: 'interaction-performance',
          title: 'catalog.direction.interactionPerformance',
          icon: MousePointer2,
          cases: Object.freeze([]),
        }),
      ]),
    }),
    Object.freeze({
      id: 'llm',
      title: 'catalog.group.llm',
      directions: Object.freeze([
        Object.freeze({
          id: 'generation-accuracy',
          title: 'catalog.direction.generationAccuracy',
          icon: Sparkles,
          cases: Object.freeze([]),
        }),
        Object.freeze({
          id: 'incremental-generation',
          title: 'catalog.direction.incrementalGeneration',
          icon: RefreshCw,
          cases: Object.freeze([]),
        }),
      ]),
    }),
  ]),
});

/** 返回指定模块的三层测试目录 */
export const getModuleTestGroups = (moduleId: BenchModuleIdValue): ReadonlyArray<BenchTestGroup> =>
  moduleGroups[moduleId] ?? Object.freeze([]);

/** 返回指定模块中的测试用例 */
export const getBenchTestCase = (moduleId: BenchModuleIdValue, caseId: string): BenchTestCase | undefined =>
  getBenchTestCaseContext(moduleId, caseId)?.testCase;

/** 返回用例在分组和方向中的完整上下文 */
export const getBenchTestCaseContext = (
  moduleId: BenchModuleIdValue,
  caseId: string,
): BenchTestCaseContext | undefined => {
  for (const group of getModuleTestGroups(moduleId)) {
    for (const direction of group.directions) {
      const testCase = direction.cases.find(candidate => candidate.id === caseId);
      if (testCase !== undefined) return Object.freeze({ group, direction, testCase });
    }
  }
  return undefined;
};

/** 返回模块中的默认可运行用例 */
export const getDefaultBenchTestCase = (moduleId: BenchModuleIdValue): BenchTestCase | undefined =>
  getModuleTestGroups(moduleId).flatMap(group => group.directions.flatMap(direction => direction.cases))[0];

/** 返回指定模块的全部测试用例 */
export const getModuleTestCases = (moduleId: BenchModuleIdValue): ReadonlyArray<BenchTestCase> =>
  Object.freeze(getModuleTestGroups(moduleId).flatMap(group => group.directions.flatMap(direction => direction.cases)));

/** 生成稳定的 Bench 用例页面路径 */
export const getBenchCasePath = (moduleId: BenchModuleIdValue, caseId: string, view: BenchCaseViewValue): string =>
  `/${moduleId}/cases/${caseId}/${view}`;
