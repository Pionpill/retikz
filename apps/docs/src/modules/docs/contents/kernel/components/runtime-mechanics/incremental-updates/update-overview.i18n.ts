import type { Lang } from '@/i18n';

/** 增量更新机制图文案 */
export const text: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    input: ['新输入', 'A.fill：橙 → 蓝'],
    runtime: ['Vanilla', '准备输入与会话更新'],
    core: ['Reconciler', '准备 Weave / 完整结果'],
    host: ['宿主显示', 'DOM 事务 / React 订阅'],
    result: ['候选结果', '完整编译输出'],
  },
  en: {
    input: ['New input', 'A.fill: orange → blue'],
    runtime: ['Vanilla', 'Prepare input and session update'],
    core: ['Reconciler', 'Prepare Weave / full result'],
    host: ['Host display', 'DOM transaction / React'],
    result: ['Candidate output', 'Complete compilation output'],
  },
};
