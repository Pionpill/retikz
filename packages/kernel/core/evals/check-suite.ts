import { it, expect, afterAll } from 'vitest';

import { inspectSchemaEvalCoverage, writeSchemaCoverageReport } from '../../../../scripts/evals';
import type { createEvalSuite } from './create-suite';

/** 每题校验契约、评分与提示隔离，并输出带判分路径的覆盖矩阵 */
export const checkSuite = <T>(name: string, suite: ReturnType<typeof createEvalSuite<T>>) => {
  it('题号唯一', () => expect(new Set(suite.cases.map(item => item.id)).size).toBe(suite.cases.length));
  for (const [index, item] of suite.cases.entries())
    it(item.id, () => {
      const raw = JSON.stringify(item.expected);
      const score = suite.grade(item, raw);
      expect(score.success, score.diagnostics.join('\n')).toBe(true);
      if (item.contrastId) {
        const paired = suite.cases.find(candidate => candidate.id === item.contrastId);
        expect(paired?.contrastId).toBe(item.id);
        const wrong = suite.grade(item, JSON.stringify(paired!.expected));
        expect(wrong.schemaValid).toBe(true);
        expect(wrong.success).toBe(false);
      }
      expect(suite.grade(item, JSON.stringify(suite.cases[(index + 1) % suite.cases.length].expected)).success).toBe(
        false,
      );
      const prompt = suite.prompt(item);
      expect(JSON.parse(prompt!.user)).toEqual({ schema: suite.contract, task: item.task });
    });
  afterAll(() => {
    const report = inspectSchemaEvalCoverage(suite.contract, suite.cases, suite.grade);
    writeSchemaCoverageReport(report, {
      directory: new URL('../../../../notes/reports/', import.meta.url),
      name: name + '-eval-offline',
      title: name + ' 离线断言覆盖',
      description: '只统计当前宿主的直接证据；不将其他宿主的题或开放载荷自动计为覆盖。',
    });
  });
};
