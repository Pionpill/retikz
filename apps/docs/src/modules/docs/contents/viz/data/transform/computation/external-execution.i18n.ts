import type { Lang } from '@/i18n';

/** 执行模式示例与控件共用的可见文案 */
export const externalExecutionI18n: Record<
  Lang,
  {
    title: string;
    data: string;
    execution: string;
    mode: string;
    builtin: string;
    external: string;
    hybrid: string;
    order: string;
    ascending: string;
    descending: string;
    completed: string;
  }
> = {
  zh: {
    title: '执行模式',
    data: '原始数据',
    execution: '执行配置',
    mode: '执行模式',
    builtin: '全本地',
    external: '全外接',
    hybrid: '混合',
    order: '排序方向',
    ascending: '升序',
    descending: '降序',
    completed: '外接 Promise 累计完成次数',
  },
  en: {
    title: 'Execution modes',
    data: 'Source rows',
    execution: 'Execution settings',
    mode: 'Mode',
    builtin: 'Local only',
    external: 'External only',
    hybrid: 'Hybrid',
    order: 'Sort order',
    ascending: 'Ascending',
    descending: 'Descending',
    completed: 'Completed external Promises',
  },
};
