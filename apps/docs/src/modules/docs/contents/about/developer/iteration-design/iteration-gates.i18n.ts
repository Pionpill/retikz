import type { Lang } from '@/i18n';

/** 两个 Gate 流程图的本地化标签 */
export type IterationGatesI18n = Readonly<{
  adr: string;
  architectureGate: string;
  confirmAdr: string;
  plan: string;
  planGate: string;
  implementation: string;
}>;

/** 按文档语言获取两个 Gate 的流程标签 */
export const iterationGatesI18n: Record<Lang, IterationGatesI18n> = {
  zh: {
    adr: 'ADR 与简略计划',
    architectureGate: 'Architecture Gate',
    confirmAdr: '人工确认 ADR',
    plan: '细化计划与测试契约',
    planGate: 'Plan Gate',
    implementation: '授权后实施',
  },
  en: {
    adr: 'ADR and brief plan',
    architectureGate: 'Architecture Gate',
    confirmAdr: 'Human confirms ADR',
    plan: 'Refined plan and test contract',
    planGate: 'Plan Gate',
    implementation: 'Implement when authorized',
  },
};
