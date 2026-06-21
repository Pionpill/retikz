/** demo 自造数据集：剂量-响应散点（dose 离散数值剂量 + response），多点同剂量重叠，喂 jitter 抖开（不进 IR） */
export const samples: Array<Record<string, number>> = [
  { dose: 1, response: 12 },
  { dose: 1, response: 14 },
  { dose: 1, response: 13 },
  { dose: 1, response: 15 },
  { dose: 2, response: 20 },
  { dose: 2, response: 22 },
  { dose: 2, response: 19 },
  { dose: 2, response: 21 },
  { dose: 3, response: 28 },
  { dose: 3, response: 30 },
  { dose: 3, response: 27 },
  { dose: 3, response: 31 },
];
