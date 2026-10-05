import type { Lang } from '@/i18n';

/** 关系局部处理阶段 */
export const relationFlowI18n: Record<Lang, Array<string>> = {
  zh: ['Relation Source', '校验语义与方向', '解析结构与外观', '生成 Core Path'],
  en: ['Relation Source', 'Check semantics', 'Resolve appearance', 'Produce Core Path'],
};
