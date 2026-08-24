/** StatsBomb Open Data 数据仓库 */
export const STATSBOMB_OPEN_DATA_URL = 'https://github.com/statsbomb/open-data';

/** StatsBomb Open Data 使用许可 */
export const STATSBOMB_OPEN_DATA_LICENSE = 'StatsBomb Open Data User Agreement';

/** 2022 世界杯阿根廷七场比赛中 Lionel Messi 的全部 Shot 事件数，含 2 次点球大战事件 */
export const MESSI_WORLD_CUP_RAW_SHOT_COUNT = 34;

/**
 * Lionel Messi 2022 世界杯射门
 * @description 从 competition 43、season 106 的阿根廷七场比赛筛选 player Lionel Andres Messi 与 type Shot，排除 period 5 点球大战，保留 period 1 至 4 共 32 次射门；StatsBomb 坐标为 120 x 80，本次有效记录的起点和终点坐标均完整
 */
export const messiWorldCupShots = [
  { opponent: 'Netherlands', minute: 21, x: 96.6, y: 50.3, endX: 120, endY: 35.7, outcome: 'Off T', xg: 0.0378 },
  { opponent: 'Netherlands', minute: 39, x: 104, y: 32.2, endX: 118.1, endY: 39.1, outcome: 'Saved', xg: 0.0339 },
  { opponent: 'Netherlands', minute: 62, x: 96, y: 33.3, endX: 120, endY: 43.7, outcome: 'Off T', xg: 0.0761 },
  { opponent: 'Netherlands', minute: 72, x: 108, y: 40, endX: 120, endY: 43.3, outcome: 'Goal', xg: 0.7835 },
  { opponent: 'Netherlands', minute: 109, x: 101.1, y: 53.3, endX: 120, endY: 34.4, outcome: 'Off T', xg: 0.0354 },
  { opponent: 'Netherlands', minute: 119, x: 96.6, y: 41.6, endX: 97.2, endY: 41.6, outcome: 'Blocked', xg: 0.042 },
  { opponent: 'France', minute: 22, x: 108, y: 40, endX: 120, endY: 41.8, outcome: 'Goal', xg: 0.7835 },
  { opponent: 'France', minute: 59, x: 109.7, y: 46, endX: 120, endY: 45.5, outcome: 'Off T', xg: 0.1156 },
  { opponent: 'France', minute: 96, x: 96.2, y: 40.9, endX: 117.6, endY: 39.3, outcome: 'Saved', xg: 0.043 },
  { opponent: 'France', minute: 106, x: 103.6, y: 55.8, endX: 119, endY: 43.9, outcome: 'Saved', xg: 0.0248 },
  { opponent: 'France', minute: 107, x: 116.6, y: 43, endX: 120, endY: 40.9, outcome: 'Goal', xg: 0.4884 },
  { opponent: 'Australia', minute: 34, x: 104.2, y: 48.9, endX: 120, endY: 37.1, outcome: 'Goal', xg: 0.0666 },
  { opponent: 'Australia', minute: 49, x: 99.8, y: 38.5, endX: 116.9, endY: 40, outcome: 'Saved', xg: 0.0452 },
  { opponent: 'Australia', minute: 65, x: 95.4, y: 33.6, endX: 120, endY: 31.6, outcome: 'Off T', xg: 0.0328 },
  { opponent: 'Australia', minute: 92, x: 104.6, y: 52.2, endX: 120, endY: 36.5, outcome: 'Off T', xg: 0.0556 },
  { opponent: 'Australia', minute: 93, x: 102.2, y: 40, endX: 103.5, endY: 39.9, outcome: 'Blocked', xg: 0.032 },
  { opponent: 'Australia', minute: 94, x: 106.4, y: 37, endX: 120, endY: 53.8, outcome: 'Wayward', xg: 0.1104 },
  { opponent: 'Poland', minute: 6, x: 99, y: 37.7, endX: 116.7, endY: 37.9, outcome: 'Saved', xg: 0.0509 },
  { opponent: 'Poland', minute: 9, x: 111.7, y: 25.8, endX: 118.9, endY: 35.9, outcome: 'Saved', xg: 0.0533 },
  { opponent: 'Poland', minute: 38, x: 108.1, y: 40.1, endX: 119.7, endY: 42.8, outcome: 'Saved', xg: 0.7835 },
  { opponent: 'Poland', minute: 52, x: 105.8, y: 28.4, endX: 120, endY: 26.1, outcome: 'Wayward', xg: 0.0612 },
  { opponent: 'Poland', minute: 55, x: 109.4, y: 50.7, endX: 109.4, endY: 44.3, outcome: 'Wayward', xg: 0.0583 },
  { opponent: 'Poland', minute: 63, x: 107.2, y: 25.9, endX: 108.1, endY: 26.7, outcome: 'Blocked', xg: 0.0239 },
  { opponent: 'Poland', minute: 70, x: 106.5, y: 35.1, endX: 117.4, endY: 38.7, outcome: 'Saved', xg: 0.1323 },
  { opponent: 'Mexico', minute: 50, x: 94.8, y: 41.9, endX: 120, endY: 41.6, outcome: 'Off T', xg: 0.0673 },
  { opponent: 'Mexico', minute: 63, x: 94.9, y: 37.4, endX: 120, endY: 43.7, outcome: 'Goal', xg: 0.0339 },
  { opponent: 'Croatia', minute: 33, x: 108, y: 40, endX: 120, endY: 42.3, outcome: 'Goal', xg: 0.7835 },
  { opponent: 'Croatia', minute: 57, x: 112.7, y: 30.1, endX: 117.5, endY: 34.5, outcome: 'Saved', xg: 0.1058 },
  { opponent: 'Saudi Arabia', minute: 1, x: 104.5, y: 44.5, endX: 117.6, endY: 40.3, outcome: 'Saved', xg: 0.1531 },
  { opponent: 'Saudi Arabia', minute: 9, x: 108, y: 40, endX: 120, endY: 38.7, outcome: 'Goal', xg: 0.7835 },
  { opponent: 'Saudi Arabia', minute: 79, x: 92.8, y: 47.1, endX: 120, endY: 43.7, outcome: 'Off T', xg: 0.0568 },
  { opponent: 'Saudi Arabia', minute: 83, x: 113.6, y: 32.2, endX: 119, endY: 39.2, outcome: 'Saved', xg: 0.0776 },
];
