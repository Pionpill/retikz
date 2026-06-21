/** demo 自造数据集：规则网格 (x, y)，喂自定义「桥」坐标系——看 x 轴被拱成曲线（不进 IR） */
const rows: Array<Record<string, number>> = [];
for (const x of [0, 2, 4, 6, 8, 10]) {
  for (const y of [0, 3, 6]) {
    rows.push({ x, y });
  }
}

export const grid = rows;
