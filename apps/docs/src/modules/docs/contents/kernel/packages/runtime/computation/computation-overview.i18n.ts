import type { Lang } from '@/i18n';

/** 总览流程的双语文案 */
export const computationOverviewI18n: Record<
  Lang,
  Record<'define' | 'register' | 'execute' | 'read' | 'dispose', string>
> = {
  zh: {
    define: '定义计算',
    register: '注册依赖',
    execute: '首次计算 / 更新',
    read: '读取发布结果',
    dispose: '释放结果',
  },
  en: {
    define: 'Define',
    register: 'Register',
    execute: 'Initialize / update',
    read: 'Read published result',
    dispose: 'Dispose',
  },
};
