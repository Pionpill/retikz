/** 每行对应一个实体的两个阶段；宽表直接保留配对关系 */
export const slopeData = [
  { entity: 'A', previous: 18, current: 32, region: 'I' },
  { entity: 'B', previous: 48, current: 62, region: 'I' },
  { entity: 'C', previous: 82, current: 74, region: 'I' },
  { entity: 'E', previous: 28, current: 44, region: 'I' },
  { entity: 'F', previous: 38, current: 20, region: 'II' },
  { entity: 'G', previous: 58, current: 98, region: 'II' },
  { entity: 'H', previous: 68, current: 86, region: 'II' },
  { entity: 'I', previous: 94, current: 110, region: 'II' },
];
/** 两个区域各四对观测，保留足够标签间距 */
export const slopeFacetData = [
  { entity: 'A', previous: 12, current: 24, region: 'I' },
  { entity: 'B', previous: 38, current: 48, region: 'I' },
  { entity: 'C', previous: 64, current: 72, region: 'I' },
  { entity: 'D', previous: 90, current: 96, region: 'I' },
  { entity: 'E', previous: 18, current: 10, region: 'II' },
  { entity: 'F', previous: 44, current: 36, region: 'II' },
  { entity: 'G', previous: 70, current: 62, region: 'II' },
  { entity: 'H', previous: 96, current: 88, region: 'II' },
];

/** 乱序演示和数据面板共用同一行顺序 */
export const slopeMappingRows = (shuffle: boolean) =>
  shuffle ? [...slopeData.slice(3), ...slopeData.slice(0, 3)] : slopeData;

/** 缺失端点演示和数据面板共用同一输入 */
export const slopeGapsRows = (missing: boolean) =>
  missing ? slopeData.map(row => (row.entity === 'B' ? { ...row, previous: null } : row)) : slopeData;
