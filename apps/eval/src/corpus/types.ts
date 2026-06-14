import { z } from 'zod';
import { AssertionSchema } from '../assert/types';

/** 语料类别：骨架只覆盖 core；plot 后置 */
export const CorpusCategory = ['core'] as const;

/**
 * 难度档（由易到难，按"图元数量 + 关系结构 + 进阶特性"递进）：
 * - single：单个图元（一个形状 / 一条线），基础样式
 * - composite：少量图元 + 一条关系（连线 / 标签 / 简单路径）
 * - complex：一张完整小图（多节点 + 边 + 标签：流程图 / 树 / 有向图 / 状态机…）
 * - advanced：特性密集的图（分支流程 / 自环 DFA / 相对定位满二叉树 / 嵌套变换分组 /
 *   渐变 / 图案 / 双向弯曲边 / ER 基数标注…），更易压出结构无效 → 提供回归区分度
 */
export const CorpusDifficulty = ['single', 'composite', 'complex', 'advanced'] as const;

/** 单条评测种子：自然语言任务 + 分类/难度标签（L1 不需要 golden 输出） */
export const CorpusPromptSchema = z.object({
  id: z.string().min(1),
  category: z.enum(CorpusCategory),
  difficulty: z.enum(CorpusDifficulty),
  prompt: z.string().min(1),
  assertions: z.array(AssertionSchema).optional(),
});

export type CorpusPrompt = z.infer<typeof CorpusPromptSchema>;
