import type { Lang } from '@/i18n';

/** 诊断图的双语文案 */
export const traceOverviewI18n: Record<
  Lang,
  Record<'runtime' | 'failure' | 'diagnostic' | 'trace' | 'error' | 'queue' | 'sink', string>
> = {
  zh: {
    runtime: 'Runtime 执行',
    failure: '操作失败',
    diagnostic: '问题诊断',
    trace: '工作量记录',
    error: 'catch 接收错误',
    queue: '本次诊断 / 累计队列',
    sink: 'trace 接收函数',
  },
  en: {
    runtime: 'Runtime execution',
    failure: 'Operation failure',
    diagnostic: 'Problem diagnostics',
    trace: 'Work counts',
    error: 'Error to catch',
    queue: 'Operation / queued diagnostics',
    sink: 'Trace receiver',
  },
};
