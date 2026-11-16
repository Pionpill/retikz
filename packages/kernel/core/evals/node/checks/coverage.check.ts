import { afterAll, describe, expect, it } from 'vitest';

import { writeSchemaCoverageReport } from '../../../../../../scripts/evals';
import { inspectNodeEvalCoverage } from '../suite';

/** 同一轮自检使用同一契约与判分快照 */
const report = inspectNodeEvalCoverage();

afterAll(() => {
  const path = writeSchemaCoverageReport(report, {
    directory: new URL('../../../../../../notes/reports/', import.meta.url),
    name: 'node-eval-offline',
    title: 'NodeSchema 离线配置断言覆盖',
    description:
      '这是用例与确定性判分器的功能自检，模型调用为 0，不提供 LLM 成功率。描述位置关联不等于多句描述中所有独立语义均已被验证；运行时性质与已知缺口见 [评估说明](../../packages/kernel/core/evals/README.md)。',
  });
  console.info(`离线覆盖清单：${path}`);
});

describe('完整节点契约的离线覆盖清单', () => {
  it('属性、描述与分支均有关联断言或明确的宿主诊断', () => {
    expect(report.entries.filter(entry => entry.kind === 'property')).toHaveLength(249);
    expect(report.entries.filter(entry => entry.kind === 'description')).toHaveLength(246);
    expect(report.entries.filter(entry => entry.kind === 'branch')).toHaveLength(93);
    expect(report.entries.filter(entry => entry.status === 'gap')).toEqual([]);
    expect(report.entries.filter(entry => entry.status === 'diagnostic')).not.toHaveLength(0);
    expect(
      report.entries
        .filter(entry => entry.status === 'direct')
        .every(entry => entry.witnesses.some(witness => witness.assertionPaths.length > 0)),
    ).toBe(true);
  });

  it('契约名称、结构、约束或描述变化后要求重新审阅用例', () => {
    expect(report.contractSha256).toBe('ab7cd9ef50a5fb8f9ddd471e0f056d898bb2dbf9f4747211d54842e82250ebce');
  });
});
