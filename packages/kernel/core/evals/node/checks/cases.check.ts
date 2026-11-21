import type { JsonValue } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

import { isJsonObject } from '../../../../../../scripts/evals';
import { NodeSchema } from '../../../src';
import { gradeNodeAnswer, nodeEvalCases } from '../suite';

describe('节点语义用例的离线完整性', () => {
  it('相同线性渐变放在填充、主体描边或标签引线上时不能互换', () => {
    const placements = ['NF001', 'NF006', 'NF011'].map(id => nodeEvalCases.find(item => item.id === id)!);
    for (const target of placements) {
      for (const candidate of placements) {
        const score = gradeNodeAnswer(target, JSON.stringify(candidate.expected));
        expect(score.schemaValid).toBe(true);
        expect(score.success).toBe(candidate.id === target.id);
      }
    }
  });

  it('稳定 ID 唯一，所有题目始终是完整节点任务', () => {
    expect(new Set(nodeEvalCases.map(testCase => testCase.id)).size).toBe(nodeEvalCases.length);
    expect(nodeEvalCases.filter(testCase => testCase.diagnostic === undefined)).toHaveLength(141);
    expect(nodeEvalCases.filter(testCase => testCase.diagnostic !== undefined)).toHaveLength(1);
  });

  it('仍通过完整 schema 的单点错值不能误判为正确配置', () => {
    const mutations = (input: JsonValue): Array<JsonValue> => {
      if (Array.isArray(input))
        return input.flatMap((value, index) =>
          mutations(value).map(changed => input.map((original, position) => (position === index ? changed : original))),
        );
      if (isJsonObject(input))
        return Object.entries(input).flatMap(([field, value]) =>
          mutations(value).map(changed => ({ ...input, [field]: changed })),
        );
      if (typeof input === 'number') return [input + (Number.isInteger(input) ? 1 : 0.125)];
      if (typeof input === 'string') return [input + '※'];
      if (typeof input === 'boolean') return [!input];
      return [true];
    };
    let checked = 0;
    for (const testCase of nodeEvalCases) {
      if (testCase.diagnostic !== undefined) continue;
      const reference: JsonValue = JSON.parse(JSON.stringify(testCase.expected));
      for (const changed of mutations(reference)) {
        if (!NodeSchema.safeParse(changed).success) continue;
        const score = gradeNodeAnswer(testCase, JSON.stringify(changed));
        expect(score.success, `${testCase.id}: ${JSON.stringify(changed)}`).toBe(false);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(146);
  });

  for (const testCase of nodeEvalCases) {
    it(`${testCase.id} ${testCase.task}：参考输入合法且对应判分规则成立`, () => {
      expect(NodeSchema.safeParse(testCase.expected).success).toBe(true);
      const score = gradeNodeAnswer(testCase, JSON.stringify(testCase.expected));
      if (testCase.diagnostic !== undefined) {
        expect(score.eligible).toBe(false);
        expect(score.success).toBe(false);
      } else {
        expect(score.checks.filter(check => !check.passed)).toEqual([]);
        expect(score.success).toBe(true);
      }
    });

    if (testCase.counterexample)
      it(`${testCase.id}：拒绝已知的结构合法语义反例`, () => {
        const counterexample = testCase.counterexample!;
        expect(NodeSchema.safeParse(counterexample.expected).success).toBe(true);
        const score = gradeNodeAnswer(testCase, JSON.stringify(counterexample.expected));
        expect(score.schemaValid).toBe(true);
        expect(score.success).toBe(false);
        expect(score.checks.some(check => !check.passed)).toBe(true);
      });
  }
});
