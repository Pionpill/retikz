import type { Lang } from '@/i18n';

/** 诊断图的双语文案 */
export const traceFlowI18n: Record<
  Lang,
  Record<'report' | 'validate' | 'sink' | 'diagnostics' | 'queue' | 'valid' | 'invalid' | 'failed', string>
> = {
  zh: {
    report: 'context.trace.report',
    validate: '校验记录\n绑定 owner',
    sink: '同步调用接收函数',
    diagnostics: '生成局部诊断',
    queue: 'Runtime 补齐归属\n随操作收集诊断',
    valid: '合法',
    invalid: '不合法',
    failed: '抛错 / 重入',
  },
  en: {
    report: 'context.trace.report',
    validate: 'Validate record\nBind owner',
    sink: 'Call receiver synchronously',
    diagnostics: 'Create local diagnostic',
    queue: 'Runtime adds context\nCollect for the operation',
    valid: 'Valid',
    invalid: 'Invalid',
    failed: 'Throw / reentry',
  },
};
