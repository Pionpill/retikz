import type { Lang } from '@/i18n';

export const layoutRootScopeI18n = {
  zh: {
    implicit: 'rootScope：自动包装',
    explicit: 'Scope：显式包装',
    inherited: 'A：继承蓝色',
    overridden: 'B：显式橙色',
    result: '相同的子图，相同的继承结果',
  },
  en: {
    implicit: 'rootScope: auto wrap',
    explicit: 'Scope: explicit wrap',
    inherited: 'A: inherited blue',
    overridden: 'B: explicit orange',
    result: 'Same children, same inherited styles',
  },
} satisfies Record<Lang, Record<string, string>>;
