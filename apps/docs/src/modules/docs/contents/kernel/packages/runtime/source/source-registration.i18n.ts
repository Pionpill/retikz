import type { Lang } from '@/i18n';

/** 来源注册与初始输入图的文案 */
export const sourceRegistrationI18n: Record<
  Lang,
  {
    definition: string;
    sources: string;
    computations: string;
    input: string;
    runtime: string;
    register: string;
    bind: string;
    snapshot: string;
    dispose: string;
    finish: string;
  }
> = {
  zh: {
    definition: 'defineRuntimeSource\n返回 position Token',
    sources: 'createRuntimeSourceRegistry\n登记来源定义',
    computations: '计算注册表\ncomputations（本例为空）',
    input: '定义 + 输入数据\ncreateRuntimeSourceInput',
    runtime: 'createRuntime\n捕获输入并建立初始状态',
    register: '收集定义',
    bind: '配对 input',
    snapshot: 'runtime.snapshot(position)\n读取已发布状态',
    dispose: 'runtime.dispose()\n释放所持资源',
    finish: '使用结束',
  },
  en: {
    definition: 'defineRuntimeSource\nReturn the position token',
    sources: 'createRuntimeSourceRegistry\nRegister Source definitions',
    computations: 'Computation registry\ncomputations (empty here)',
    input: 'Definition + input data\ncreateRuntimeSourceInput',
    runtime: 'createRuntime\nCapture input and initialize state',
    register: 'Collect definitions',
    bind: 'Pair with input',
    snapshot: 'runtime.snapshot(position)\nRead committed state',
    dispose: 'runtime.dispose()\nRelease owned resources',
    finish: 'After use',
  },
};
