import type { SchemaEvalCase } from './types';

/** 与主 agent 历史隔离的两个消息内容 */
export type SchemaEvalPrompt = {
  /** 固定生成指令 */
  system: string;
  /** 完整输入契约与当前任务 */
  user: string;
};

/** 只发送契约和任务；诊断用例不产生模型请求 */
export const buildSchemaEvalPrompt = <TExpected>(
  schema: object,
  testCase: SchemaEvalCase<TExpected>,
  instruction: string,
): SchemaEvalPrompt | null =>
  testCase.diagnostic !== undefined
    ? null
    : { system: instruction, user: JSON.stringify({ schema, task: testCase.task }) };
