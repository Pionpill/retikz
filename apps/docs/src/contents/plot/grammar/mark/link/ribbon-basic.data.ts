/**
 * demo 自造数据集：两列 alluvial 流带（左侧来源 → 右侧去向），喂 ribbon-basic.demo.tsx 的 <Plot data>（不进 IR）。
 * 布局（节点排在哪、流量怎么堆叠）由这里预先算好写回每行：sourceX/Y 左列、targetX/Y 右列、value 流量。
 * <LinkMark> 只消费这些已算好的位置 + 宽度，不自带 sankey 布局算法。
 */
export const flows: Array<Record<string, string | number>> = [
  { source: 'Desktop', target: 'Signup', sourceX: 0, sourceY: 80, targetX: 160, targetY: 78, value: 50, channel: 'Desktop' },
  { source: 'Desktop', target: 'Bounce', sourceX: 0, sourceY: 80, targetX: 160, targetY: 28, value: 30, channel: 'Desktop' },
  { source: 'Mobile', target: 'Signup', sourceX: 0, sourceY: 26, targetX: 160, targetY: 78, value: 18, channel: 'Mobile' },
  { source: 'Mobile', target: 'Bounce', sourceX: 0, sourceY: 26, targetX: 160, targetY: 28, value: 34, channel: 'Mobile' },
];
