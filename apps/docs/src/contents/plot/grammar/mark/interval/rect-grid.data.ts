/** demo 自造数据集：周 × 时段的纯网格（无值映射），喂 rect-bounds.demo.tsx 的 <Plot data>（不进 IR） */
export const slots: Array<Record<string, string>> = [
  { day: 'Mon', slot: 'AM' },
  { day: 'Mon', slot: 'PM' },
  { day: 'Tue', slot: 'AM' },
  { day: 'Tue', slot: 'PM' },
  { day: 'Wed', slot: 'AM' },
  { day: 'Wed', slot: 'PM' },
];
