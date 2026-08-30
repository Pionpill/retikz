/** World Bank 森林面积占国土比例指标来源 */
export const RANGED_DOT_SOURCE_URL =
  'https://api.worldbank.org/v2/country/BRA;CHN;IND;IDN;RUS;CAN;USA;AUS;DEU;FRA;ESP;ETH;KEN;NGA;ZAF;MEX;ARG;JPN/indicator/AG.LND.FRST.ZS?format=json&date=2000:2022&per_page=1000';

/** Ranged Dot 静态快照访问日期 */
export const RANGED_DOT_SOURCE_ACCESSED_AT = '2026-08-30';

/** Ranged Dot World Bank 静态快照行 */
export type RangedDotDatum = {
  country: string;
  forestArea2000: number;
  forestArea2022: number;
};

/**
 * 十八个国家 2000 与 2022 年森林面积占国土比例
 *
 * @remarks 数据来自 World Bank WDI 指标 `AG.LND.FRST.ZS`，四舍五入至
 * 一位小数，并按 2022 年数值升序排列。样本保留增加、减少和接近不变的国家
 */
export const rangedDotData: Array<RangedDotDatum> = [
  { country: 'Kenya', forestArea2000: 7, forestArea2022: 6.2 },
  { country: 'Argentina', forestArea2000: 12.2, forestArea2022: 10.4 },
  { country: 'South Africa', forestArea2000: 14.7, forestArea2022: 14 },
  { country: 'Ethiopia', forestArea2000: 18.5, forestArea2022: 15 },
  { country: 'Australia', forestArea2000: 17.2, forestArea2022: 17.4 },
  { country: 'Nigeria', forestArea2000: 27.3, forestArea2022: 23.4 },
  { country: 'China', forestArea2000: 18.9, forestArea2022: 23.8 },
  { country: 'India', forestArea2000: 22.7, forestArea2022: 24.4 },
  { country: 'France', forestArea2000: 28.4, forestArea2022: 32.3 },
  { country: 'Germany', forestArea2000: 32.5, forestArea2022: 32.7 },
  { country: 'Mexico', forestArea2000: 35.2, forestArea2022: 33.7 },
  { country: 'United States', forestArea2000: 33.1, forestArea2022: 33.9 },
  { country: 'Spain', forestArea2000: 34.3, forestArea2022: 37.2 },
  { country: 'Canada', forestArea2000: 38.8, forestArea2022: 39.5 },
  { country: 'Indonesia', forestArea2000: 53.9, forestArea2022: 48 },
  { country: 'Russian Federation', forestArea2000: 49.4, forestArea2022: 49.8 },
  { country: 'Brazil', forestArea2000: 65.9, forestArea2022: 59.1 },
  { country: 'Japan', forestArea2000: 68.2, forestArea2022: 68.4 },
];
