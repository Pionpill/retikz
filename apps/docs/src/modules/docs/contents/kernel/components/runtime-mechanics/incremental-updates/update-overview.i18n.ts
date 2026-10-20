import type { Lang } from '@/i18n';

/** 增量更新机制图文案 */
export const text: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    input: ['新输入', 'A.fill：橙 → 蓝'],
    runtime: ['Runtime', '比较来源，选择计算'],
    core: ['Reconciler', '准备 Weave / 完整结果'],
    host: ['宿主显示', 'DOM 事务 / React 订阅'],
    result: ['候选结果', '完整 Scene + Patch'],
  },
  en: {
    input: ['New input', 'A.fill: orange → blue'],
    runtime: ['Runtime', 'Compare and schedule'],
    core: ['Reconciler', 'Prepare Weave / full result'],
    host: ['Host display', 'DOM transaction / React'],
    result: ['Candidate output', 'Complete Scene + Patch'],
  },
};
