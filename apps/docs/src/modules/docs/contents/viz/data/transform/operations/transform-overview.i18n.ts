import type { Lang } from '@/i18n';

/** 执行阶段标签 */
export const transformOverviewI18n: Record<Lang, Array<string>> = {
  zh: ['解析声明', '推导字段模型', '预检计算实现', '执行并校验结果'],
  en: ['Parse declarations', 'Resolve field models', 'Preflight implementations', 'Execute and validate'],
};
