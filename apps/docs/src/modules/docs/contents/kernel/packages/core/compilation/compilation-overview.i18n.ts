import type { Lang } from '@/i18n';

/** 编译主线的双语文案 */
export const compilationOverviewI18n: Record<
  Lang,
  Record<'input' | 'context' | 'visit' | 'pending' | 'assemble' | 'output', string>
> = {
  zh: {
    input: '输入 IR',
    context: '建立上下文',
    visit: '遍历与布局',
    pending: '回填延迟路径',
    assemble: '汇总编译结果',
    output: 'Scene 与附属产物',
  },
  en: {
    input: 'Input IR',
    context: 'Create context',
    visit: 'Traverse and lay out',
    pending: 'Fill deferred paths',
    assemble: 'Assemble result',
    output: 'Scene and artifacts',
  },
};
