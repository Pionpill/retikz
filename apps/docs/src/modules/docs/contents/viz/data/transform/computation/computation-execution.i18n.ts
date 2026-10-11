import type { Lang } from '@/i18n';

/** 计算契约流程标签 */
export const computationExecutionI18n: Record<Lang, Array<string>> = {
  zh: ['resolveDataTransforms：解析声明', 'prepare：匹配全部阶段实现', 'bind：绑定实际输入', 'execute：依次计算与校验'],
  en: [
    'resolveDataTransforms: resolve declarations',
    'prepare: match all stage implementations',
    'bind: attach actual input',
    'execute: compute and validate in order',
  ],
};
