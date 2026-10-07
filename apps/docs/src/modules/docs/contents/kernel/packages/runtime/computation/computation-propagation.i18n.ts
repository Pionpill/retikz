import type { Lang } from '@/i18n';

/** 依赖传播示意图的双语说明 */
export const computationPropagationI18n: Record<
  Lang,
  { updated: string; bailout: string; skipped: string; chain: string; stopped: string; alternate: string }
> = {
  zh: {
    updated: '执行 · 新结果',
    bailout: '执行 · bailout',
    skipped: '跳过 · 旧结果',
    chain: '新结果继续传播',
    stopped: '全部上游 bailout\n下游跳过',
    alternate: '另一上游有新结果\n下游仍执行',
  },
  en: {
    updated: 'Executed · new result',
    bailout: 'Executed · bailout',
    skipped: 'Skipped · old result',
    chain: 'New results propagate',
    stopped: 'All upstreams bail out\nDownstream skips',
    alternate: 'Another upstream changes\nDownstream executes',
  },
};
