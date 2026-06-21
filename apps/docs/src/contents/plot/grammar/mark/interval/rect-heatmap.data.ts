/** demo 自造数据集：3×3 网格热图（行 row × 列 col 双分类，value 经色阶映射），喂 rect-heatmap.demo.tsx 的 <Plot data>（不进 IR） */
export const matrix: Array<Record<string, string | number>> = [
  { row: 'A', col: 'X', value: 1 },
  { row: 'A', col: 'Y', value: 5 },
  { row: 'A', col: 'Z', value: 9 },
  { row: 'B', col: 'X', value: 4 },
  { row: 'B', col: 'Y', value: 7 },
  { row: 'B', col: 'Z', value: 2 },
  { row: 'C', col: 'X', value: 8 },
  { row: 'C', col: 'Y', value: 3 },
  { row: 'C', col: 'Z', value: 6 },
];
