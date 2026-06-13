import { type LlmClient } from '../../src/llm/types';

/**
 * 测试用 fake client：按调用次序返回预置文本，循环复用最后一条。
 * 让 runner / 报告链路可在无 API key、确定性下完整 TDD。
 */
export const fakeClient = (id: string, responses: Array<string>): LlmClient => {
  let i = 0;
  return {
    id,
    generate: () => {
      const text = responses[Math.min(i, responses.length - 1)] ?? '';
      i += 1;
      return Promise.resolve(text);
    },
  };
};
