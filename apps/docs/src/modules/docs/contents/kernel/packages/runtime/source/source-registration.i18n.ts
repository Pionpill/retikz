import type { Lang } from '@/i18n';

/** 主题关系图的双语文案 */
export const sourceRegistrationI18n: Record<
  Lang,
  { definition: string; registry: string; find: string; resolve: string; list: string }
> = {
  zh: {
    definition: 'defineRuntimeSource\n处理规则 → Token',
    registry: 'createRuntimeSourceRegistry\n登记 Token 数组',
    find: 'find(key)\n按名称找定义',
    resolve: 'resolve(token)\n验证原凭证',
    list: 'definitions()\n列举来源',
  },
  en: {
    definition: 'defineRuntimeSource\nRules → token',
    registry: 'createRuntimeSourceRegistry\nRegister tokens',
    find: 'find(key)\nFind by name',
    resolve: 'resolve(token)\nCheck membership',
    list: 'definitions()\nList Sources',
  },
};
