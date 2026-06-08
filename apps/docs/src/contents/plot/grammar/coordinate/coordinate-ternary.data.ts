/** demo 自造数据集：土壤砂 / 粉 / 黏配比（任意正值，coordinate 内自动归一化）+ 地区分组（不进 IR） */
export const soils: Array<Record<string, string | number>> = [
  { sand: 60, silt: 30, clay: 10, region: 'north' },
  { sand: 20, silt: 50, clay: 30, region: 'north' },
  { sand: 40, silt: 40, clay: 20, region: 'south' },
  { sand: 15, silt: 25, clay: 60, region: 'south' },
  { sand: 33, silt: 33, clay: 34, region: 'east' },
  { sand: 70, silt: 20, clay: 10, region: 'east' },
];
