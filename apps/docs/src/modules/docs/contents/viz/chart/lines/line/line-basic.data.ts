/** 两个系列在六个采样位置的观测，B 的第三次观测缺失 */
export const lineData = [
  { x: 1, y: 12, series: 'A' },
  { x: 2, y: 18, series: 'A' },
  { x: 3, y: 15, series: 'A' },
  { x: 4, y: 24, series: 'A' },
  { x: 5, y: 20, series: 'A' },
  { x: 6, y: 28, series: 'A' },
  { x: 1, y: 9, series: 'B' },
  { x: 2, y: 13, series: 'B' },
  { x: 3, y: null, series: 'B' },
  { x: 4, y: 17, series: 'B' },
  { x: 5, y: 23, series: 'B' },
  { x: 6, y: 21, series: 'B' },
];

/** 乱序演示和数据面板共用同一行顺序 */
export const lineMappingRows = (shuffle: boolean) =>
  shuffle ? [lineData[2], lineData[0], lineData[1], ...lineData.slice(3)] : lineData;
