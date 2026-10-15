/** PointMark API 示例数据：位置、样式、文本三个 demo 共用；数据本身不进 IR。 */
export const points: Array<Record<string, string | number>> = [
  { x: 15, y: 30, pop: 90, region: 'East', label: 'A', description: 'A node\nSample' },
  { x: 45, y: 70, pop: 260, region: 'West', label: 'B', description: 'B node\nSample' },
  { x: 80, y: 40, pop: 160, region: 'North', label: 'C', description: 'C node\nSample' },
  { x: 120, y: 85, pop: 420, region: 'East', label: 'D', description: 'D node\nSample' },
  { x: 165, y: 55, pop: 220, region: 'West', label: 'E', description: 'E node\nSample' },
  { x: 210, y: 95, pop: 520, region: 'North', label: 'F', description: 'F node\nSample' },
];

/** 成对重叠的节点用于比较混合模式和绘制顺序 */
export const stylePoints = points.map((row, index) => ({
  ...row,
  x: 40 + Math.floor(index / 2) * 70,
  y: 40 + Math.floor(index / 2) * 20 + (index % 2) * 2,
  region: ['East', 'East', 'West', 'West', 'North', 'North'][index],
  order: index,
  reverseOrder: -index,
}));

/** 首尾相接的辅助连线用于观察节点连接边界 */
export const shapePoints = points.map((row, index) => ({
  ...row,
  nextLabel: points[(index + 1) % points.length].label,
}));
