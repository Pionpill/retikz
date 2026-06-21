/** demo 自造数据集：各套餐档的营收（categorical segment + continuous revenue），喂柱状 band（不进 IR） */
export const segments: Array<Record<string, string | number>> = [
  { segment: 'Free', revenue: 80 },
  { segment: 'Team', revenue: 136 },
  { segment: 'Pro', revenue: 176 },
  { segment: 'Business', revenue: 148 },
  { segment: 'Enterprise', revenue: 212 },
];
