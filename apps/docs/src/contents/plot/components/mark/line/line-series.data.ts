/** demo 自造数据集：两城气温（city 系列 + month + temp），喂多系列折线（不进 IR） */
export const climate: Array<Record<string, string | number>> = [
  { city: 'Oslo', month: 0, temp: -3 },
  { city: 'Oslo', month: 1, temp: 2 },
  { city: 'Oslo', month: 2, temp: 9 },
  { city: 'Oslo', month: 3, temp: 16 },
  { city: 'Rome', month: 0, temp: 8 },
  { city: 'Rome', month: 1, temp: 12 },
  { city: 'Rome', month: 2, temp: 18 },
  { city: 'Rome', month: 3, temp: 23 },
];
