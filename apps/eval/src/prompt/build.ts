import { type CorpusPrompt } from '../corpus/types';

/**
 * 组装自由生成 prompt：schema 契约作上下文 + 任务描述 + 严格输出约束。
 * 不做 few-shot、不给样例 IR（避免泄题、保留 L1 真实信号）。
 */
export const buildPrompt = (task: CorpusPrompt, schemaJson: string): string =>
  [
    'You generate a retikz IR scene as a single JSON object.',
    'The JSON MUST conform to this JSON Schema (the canonical, JSON-serializable drawing IR):',
    '',
    schemaJson,
    '',
    'Drawing task (natural language):',
    task.prompt,
    '',
    'Output rules:',
    '- 只输出一个 JSON 对象，不要任何解释文字。',
    '- 不要使用 markdown 代码围栏（no ```），不要前后缀。',
    '- Output ONLY the raw JSON object.',
  ].join('\n');