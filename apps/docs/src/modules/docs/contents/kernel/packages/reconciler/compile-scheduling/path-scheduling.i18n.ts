/** 调度图的中英文标签 */
export const pathSchedulingI18n = {
  zh: {
    visit: '遍历根子项',
    queue: '为路径保留位置',
    nodes: '登记 A、B 的几何',
    lookup: '求出路径端点',
    fill: '回填路径图元',
    scene: '完成 Scene',
  },
  en: {
    visit: 'Visit root children',
    queue: 'Reserve path slot',
    nodes: 'Register A and B',
    lookup: 'Resolve endpoints',
    fill: 'Fill path slot',
    scene: 'Finalize Scene',
  },
} as const;
