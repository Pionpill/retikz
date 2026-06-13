import { z } from 'zod';

/** 语料类别：骨架只覆盖 core；plot 后置 */
export const CorpusCategory = ['core'] as const;

/** 难度档：单图元 / 组合 / 复杂图 */
export const CorpusDifficulty = ['single', 'composite', 'complex'] as const;

/** 单条评测种子：自然语言任务 + 分类/难度标签（L1 不需要 golden 输出） */
export const CorpusPromptSchema = z.object({
  id: z.string().min(1),
  category: z.enum(CorpusCategory),
  difficulty: z.enum(CorpusDifficulty),
  prompt: z.string().min(1),
});

export type CorpusPrompt = z.infer<typeof CorpusPromptSchema>;
