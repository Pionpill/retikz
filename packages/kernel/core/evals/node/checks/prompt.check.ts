import { describe, expect, it } from 'vitest';

import { buildNodeEvalPrompt, nodeEvalCases } from '../suite';

describe('完整节点契约的被测模型输入', () => {
  it('只含统一指令、完整输入契约和当前任务，不泄漏参考解与判分依据', () => {
    const testCase = {
      ...nodeEvalCases[0],
      id: 'private-id-6abc',
      mustOmit: ['private-rule-6abc'],
      expected: { ...nodeEvalCases[0].expected, meta: { answer: 'private-gold-6abc' } },
    };
    const prompt = buildNodeEvalPrompt(testCase);
    expect(prompt).not.toBeNull();
    const payload = JSON.parse(prompt!.user);
    expect(Object.keys(payload).sort()).toEqual(['schema', 'task']);
    expect(Object.keys(payload.schema.properties)).toHaveLength(16);
    expect(Object.keys(payload.schema.$defs)).toHaveLength(265);
    expect(payload.task).toBe(testCase.task);
    expect(prompt!.system).toContain('只输出一个完整 Node JSON 对象');
    expect(prompt!.user).not.toContain('private-id-6abc');
    expect(prompt!.user).not.toContain('private-rule-6abc');
    expect(prompt!.user).not.toContain('private-gold-6abc');
  });

  it('契约诊断题没有用于模型采样的提示', () => {
    expect(buildNodeEvalPrompt(nodeEvalCases.find(testCase => testCase.diagnostic !== undefined)!)).toBeNull();
  });
});
