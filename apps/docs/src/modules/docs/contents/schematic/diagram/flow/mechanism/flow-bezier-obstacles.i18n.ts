import type { Lang } from '@/i18n';

/** 多节点避让示意文案 */
export const flowBezierObstaclesI18n = {
  zh: {
    titles: ['① 基线同时碰到 A、B', '② 同一组节点，比较上下候选', '③ 下侧候选无冲突，完成本轮后选中'],
    notes: [
      '先收集实际冲突节点，不把所有节点一起包住',
      '虚框：A、B 的包络；上侧候选又碰到 C',
      '若本轮最优仍受阻，合并它的新障碍再扩展一轮',
    ],
    source: '起点',
    target: '终点',
    nodes: ['A', 'B', 'C'],
    through: 'Q',
  },
  en: {
    titles: [
      '1. The baseline hits both A and B',
      '2. Compare both sides with the same nodes',
      '3. Select the clear lower route after the wave',
    ],
    notes: [
      'Collect actual blockers, not every node in the scene',
      'Dotted box: A/B envelope; the upper route hits C',
      'If the best route still conflicts, merge its blockers for wave 2',
    ],
    source: 'Start',
    target: 'End',
    nodes: ['A', 'B', 'C'],
    through: 'Q',
  },
} satisfies Record<
  Lang,
  { titles: Array<string>; notes: Array<string>; source: string; target: string; nodes: Array<string>; through: string }
>;
