import type { Lang } from '@/i18n';

/** 变换链组装与执行的阶段标签 */
export const computationChainI18n: Record<
  Lang,
  { check: string; detail: string; pass: string; error: string; valid: string; invalid: string }
> = {
  zh: {
    check: '消费方检查整条链',
    detail: '阶段、绑定类别、字段依赖',
    pass: '校验通过',
    error: '抛出错误',
    valid: '无冲突',
    invalid: '存在冲突',
  },
  en: {
    check: 'Consumer checks the chain',
    detail: 'Phases, bindings, field dependencies',
    pass: 'Validation passes',
    error: 'Throw an error',
    valid: 'No conflict',
    invalid: 'Conflict found',
  },
};
