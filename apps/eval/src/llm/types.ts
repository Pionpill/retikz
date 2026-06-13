/**
 * 评测对接的薄 LLM 抽象：一次「prompt → 文本」。
 * runner 只依赖此接口；底层可换 Vercel AI SDK / TanStack AI / 任意 provider。
 */
export type LlmClient = {
  /** provider:model 标识，进报告聚合维度 */
  id: string;
  /** 单发生成，返回模型原始文本（调用方自行抽 JSON / 打分） */
  generate: (prompt: string) => Promise<string>;
};
