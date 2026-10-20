import assert from 'node:assert/strict';

import type { BenchmarkReport } from './types';

/** 基线文件是外部输入，只在此入口校验一次 */
const assertRecord: (value: unknown) => asserts value is Record<string, unknown> = value => {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected object');
};

/** 校验字符串列表，错误和 CPU 型号都保留原始文本 */
const assertStrings: (value: unknown) => asserts value is Array<string> = value => {
  assert(Array.isArray(value) && value.every(item => typeof item === 'string'), 'Expected string array');
};

/** 拒绝非法耗时，避免 NaN 或空值被当作达标证据 */
const assertNumber: (value: unknown) => asserts value is number = value => {
  assert(typeof value === 'number' && Number.isFinite(value) && value >= 0, 'Expected finite nonnegative number');
};

/** 验证当前报告版本及预算消费的完整事实 */
const assertBaseline: (value: unknown) => asserts value is BenchmarkReport = value => {
  assertRecord(value);
  assert(value.version === 1 && typeof value.createdAt === 'string', 'Unsupported baseline version');
  assertRecord(value.environment);
  const environment = value.environment;
  for (const field of ['runnerId', 'node', 'platform', 'architecture', 'vitest', 'lockHash', 'fixtureHash']) {
    assert(typeof environment[field] === 'string' && environment[field].length > 0, `Invalid environment ${field}`);
  }
  assert(environment.artifact === 'native-esm', 'Unsupported artifact');
  assertStrings(environment.cpuModels);
  assert(environment.cpuModels.length > 0, 'Missing CPU model');
  assertNumber(environment.logicalCpuCount);
  assert(environment.logicalCpuCount > 0 && Number.isInteger(environment.logicalCpuCount));
  assertNumber(environment.totalMemoryBytes);
  assert(environment.totalMemoryBytes > 0);
  assertRecord(environment.sampling);
  for (const field of ['time', 'iterations', 'warmupTime', 'warmupIterations'])
    assertNumber(environment.sampling[field]);
  assertRecord(value.source);
  assert(
    typeof value.source.commit === 'string' &&
      typeof value.source.dirty === 'boolean' &&
      typeof value.source.sourceHash === 'string',
    'Invalid source metadata',
  );
  assertStrings(value.errors);
  assert(Array.isArray(value.scenarios), 'Missing scenarios');
  const ids = new Set<string>();
  for (const scenario of value.scenarios) {
    assertRecord(scenario);
    assert(
      typeof scenario.id === 'string' && scenario.id.length > 0 && !ids.has(scenario.id),
      'Invalid or duplicate scenario',
    );
    ids.add(scenario.id);
    assert(
      typeof scenario.execution === 'string' && ['passed', 'failed', 'skipped', 'pending'].includes(scenario.execution),
      'Invalid execution',
    );
    assertStrings(scenario.errors);
    if (scenario.statistics !== undefined) {
      assertRecord(scenario.statistics);
      for (const field of ['samples', 'mean', 'p50', 'p90', 'p99']) assertNumber(scenario.statistics[field]);
      assertNumber(scenario.statistics.samples);
      assert(Number.isInteger(scenario.statistics.samples) && scenario.statistics.samples > 0, 'Invalid sample count');
    }
    assertRecord(scenario.assessment);
    assert(
      typeof scenario.assessment.status === 'string' &&
        ['report-only', 'passed', 'exceeded', 'not-comparable', 'execution-failed'].includes(
          scenario.assessment.status,
        ),
    );
    for (const field of ['actualMs', 'limitMs']) {
      if (scenario.assessment[field] !== undefined) assertNumber(scenario.assessment[field]);
    }
    if (scenario.assessment.reason !== undefined) assert(typeof scenario.assessment.reason === 'string');
    if (scenario.assessment.metric !== undefined) {
      assert(
        typeof scenario.assessment.metric === 'string' &&
          ['mean', 'p50', 'p90', 'p99'].includes(scenario.assessment.metric),
      );
    }
    if (scenario.assessment.severity !== undefined)
      assert(
        typeof scenario.assessment.severity === 'string' && ['warn', 'error'].includes(scenario.assessment.severity),
      );
  }
};

/** 解析人工选择的历史报告，不自动选取或更新 baseline */
export const parseBaseline = (text: string): BenchmarkReport => {
  const value: unknown = JSON.parse(text);
  assertBaseline(value);
  return value;
};
