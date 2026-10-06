import type { Lang } from '@/i18n';

/** 计算完整流程的双语文案 */
export const computationFlowI18n: Record<
  Lang,
  {
    create: string;
    collect: string;
    compare: string;
    lookup: string;
    equal: string;
    query: string;
  }
> = {
  zh: {
    create: 'defineRuntimeComputation\n定义依赖与执行规则',
    collect: 'Source 注册表\n绑定来源定义',
    compare: 'createRuntimeComputationRegistry\n校验并排序计算',
    lookup: 'createRuntime / update\n按依赖执行 run / update',
    equal: 'Result\n捕获并准备读取视图',
    query: 'runtime.result(token)\n读取已发布结果',
  },
  en: {
    create: 'defineRuntimeComputation\nDefine dependencies and rules',
    collect: 'Source registry\nBind Source definitions',
    compare: 'createRuntimeComputationRegistry\nValidate and order computations',
    lookup: 'createRuntime / update\nExecute run / update in order',
    equal: 'Result\nCapture and prepare read views',
    query: 'runtime.result(token)\nRead the published result',
  },
};
