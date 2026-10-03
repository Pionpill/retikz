/** 碰撞判定示意图的双语文案 */
export const copy = {
  zh: {
    stages: ['① 整体初筛', '② 细分判定', '③ 候选选优'],
    notes: ['C 排除；A、B 继续检查', 'A 接触；B 所在空白排除', '右侧 30°：无节点冲突'],
    legend: '同一组障碍盒 A / B / C；灰色点线表示几何辅助',
    detail: '逐项比较：节点数 → 参数跨度 → 标签数 → 角度 / 侧向',
  },
  en: {
    stages: ['1. Broad phase', '2. Subdivision', '3. Select a route'],
    notes: ['Skip C; inspect A and B', 'Contact at A; clear at B', 'Right 30°: no node conflict'],
    legend: 'Same obstacle boxes A / B / C; gray dots denote geometry guides',
    detail: 'Compare in order: nodes → parameter span → labels → angle / side',
  },
} as const;
