import type { Lang } from '@/i18n';

/** 诊断图的双语文案 */
export const traceDiagnosticsI18n: Record<Lang, Record<'prepare' | 'observe' | 'cleanup' | 'complete', string>> = {
  zh: {
    prepare: '准备期间诊断',
    observe: '发布时冻结列表\n供观察者读取',
    cleanup: '通知与清理\n继续追加诊断',
    complete: '更新返回\n完整列表入队',
  },
  en: {
    prepare: 'Preparation diagnostics',
    observe: 'Freeze list at publication\nFor commit observers',
    cleanup: 'Notify and clean up\nAppend later diagnostics',
    complete: 'Return update\nQueue final list',
  },
};
