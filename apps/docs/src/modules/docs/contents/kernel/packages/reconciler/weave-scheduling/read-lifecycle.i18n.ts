/** 同一边界路径在节点尺寸更新前后的快照 */
export const readLifecycleI18n = {
  zh: {
    before: '① 首次读取',
    changed: '② A 变大，P 待检查',
    after: '③ P 已重算',
    read: '记录 A 的边界读取',
    find: '从 A 找到路径 P',
    compare: '按边界类型复核',
    resize: '扩大 A',
    refresh: '更新 P',
    legend: '橙点：P 的起点　·　虚线：待复核的旧路径',
  },
  en: {
    before: '① First read',
    changed: '② A resized, P pending',
    after: '③ P recompiled',
    read: 'Record the boundary read',
    find: 'Find P from A',
    compare: 'Recheck the boundary',
    resize: 'Resize A',
    refresh: 'Update P',
    legend: 'Orange dot: start of P   ·   Dashed line: previous path awaiting validation',
  },
};
