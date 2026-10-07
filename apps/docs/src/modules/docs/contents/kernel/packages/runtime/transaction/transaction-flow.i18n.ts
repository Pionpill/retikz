import type { Lang } from '@/i18n';

/** 事务流程图的双语文案 */
export const transactionFlowI18n: Record<
  Lang,
  Record<'input' | 'create' | 'read' | 'command' | 'update' | 'dispose', string>
> = {
  zh: {
    input: 'createRuntimeSourceInput\n配对初始输入',
    create: 'createRuntime\n捕获并首次计算',
    read: 'snapshot / result\n读取已发布状态',
    command: 'createRuntimeSourceUpdate\n配对完整新输入',
    update: 'runtime.update\n准备并发布',
    dispose: 'dispose\n释放持有资源',
  },
  en: {
    input: 'createRuntimeSourceInput\nPair initial input',
    create: 'createRuntime\nCapture and compute',
    read: 'snapshot / result\nRead published state',
    command: 'createRuntimeSourceUpdate\nPair complete new input',
    update: 'runtime.update\nPrepare and publish',
    dispose: 'dispose\nRelease owned resources',
  },
};
