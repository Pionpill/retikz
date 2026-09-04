/** World Bank 城镇化率指标来源 */
export const CONNECTED_SCATTER_URBANIZATION_SOURCE_URL =
  'https://api.worldbank.org/v2/country/BRA;CHN;IND;NGA;DEU;ZAF/indicator/SP.URB.TOTL.IN.ZS?format=json&date=1990:2020&per_page=1000';

/** World Bank 出生时预期寿命指标来源 */
export const CONNECTED_SCATTER_LIFE_EXPECTANCY_SOURCE_URL =
  'https://api.worldbank.org/v2/country/BRA;CHN;IND;NGA;DEU;ZAF/indicator/SP.DYN.LE00.IN?format=json&date=1990:2020&per_page=1000';

/** Connected Scatter 静态快照访问日期 */
export const CONNECTED_SCATTER_SOURCE_ACCESSED_AT = '2026-08-30';

/** Connected Scatter World Bank 静态快照行 */
export type ConnectedScatterDatum = {
  country: 'Brazil' | 'China' | 'India' | 'Nigeria' | 'Germany' | 'South Africa';
  year: number;
  urbanization: number;
  lifeExpectancy: number | null;
};

/**
 * 六个国家 1990–2020 年的城镇化率与出生时预期寿命轨迹
 *
 * @remarks 数据来自 World Bank WDI 指标 `SP.URB.TOTL.IN.ZS` 与
 * `SP.DYN.LE00.IN`，每五年取一个观测并四舍五入至一位小数。南非 2005 年
 * 的预期寿命在示例快照中置为 null，用于展示缺值分段与桥接策略
 */
export const connectedScatterData: Array<ConnectedScatterDatum> = [
  { country: 'Brazil', year: 1990, urbanization: 74.9, lifeExpectancy: 65.9 },
  { country: 'Brazil', year: 1995, urbanization: 77.7, lifeExpectancy: 67.7 },
  { country: 'Brazil', year: 2000, urbanization: 81.1, lifeExpectancy: 69.6 },
  { country: 'Brazil', year: 2005, urbanization: 83, lifeExpectancy: 71.8 },
  { country: 'Brazil', year: 2010, urbanization: 84.3, lifeExpectancy: 73.8 },
  { country: 'Brazil', year: 2015, urbanization: 85.7, lifeExpectancy: 75.1 },
  { country: 'Brazil', year: 2020, urbanization: 86.9, lifeExpectancy: 74.5 },
  { country: 'China', year: 1990, urbanization: 26.2, lifeExpectancy: 68.2 },
  { country: 'China', year: 1995, urbanization: 29, lifeExpectancy: 70.4 },
  { country: 'China', year: 2000, urbanization: 36.4, lifeExpectancy: 72.3 },
  { country: 'China', year: 2005, urbanization: 43, lifeExpectancy: 74.1 },
  { country: 'China', year: 2010, urbanization: 49.2, lifeExpectancy: 75.7 },
  { country: 'China', year: 2015, urbanization: 57.3, lifeExpectancy: 77 },
  { country: 'China', year: 2020, urbanization: 63.5, lifeExpectancy: 78 },
  { country: 'India', year: 1990, urbanization: 25.6, lifeExpectancy: 58.6 },
  { country: 'India', year: 1995, urbanization: 26.6, lifeExpectancy: 60.6 },
  { country: 'India', year: 2000, urbanization: 27.6, lifeExpectancy: 62.7 },
  { country: 'India', year: 2005, urbanization: 29.1, lifeExpectancy: 64.9 },
  { country: 'India', year: 2010, urbanization: 30.9, lifeExpectancy: 67.2 },
  { country: 'India', year: 2015, urbanization: 32.5, lifeExpectancy: 69.3 },
  { country: 'India', year: 2020, urbanization: 34.1, lifeExpectancy: 70.2 },
  { country: 'Nigeria', year: 1990, urbanization: 35.2, lifeExpectancy: 45.7 },
  { country: 'Nigeria', year: 1995, urbanization: 39.1, lifeExpectancy: 45.9 },
  { country: 'Nigeria', year: 2000, urbanization: 43.3, lifeExpectancy: 47.1 },
  { country: 'Nigeria', year: 2005, urbanization: 47.6, lifeExpectancy: 49.5 },
  { country: 'Nigeria', year: 2010, urbanization: 51.7, lifeExpectancy: 51.3 },
  { country: 'Nigeria', year: 2015, urbanization: 55.7, lifeExpectancy: 51.9 },
  { country: 'Nigeria', year: 2020, urbanization: 59.8, lifeExpectancy: 53.1 },
  { country: 'Germany', year: 1990, urbanization: 80, lifeExpectancy: 75.1 },
  { country: 'Germany', year: 1995, urbanization: 80, lifeExpectancy: 76.4 },
  { country: 'Germany', year: 2000, urbanization: 80.1, lifeExpectancy: 77.9 },
  { country: 'Germany', year: 2005, urbanization: 80.2, lifeExpectancy: 78.9 },
  { country: 'Germany', year: 2010, urbanization: 80.3, lifeExpectancy: 80 },
  { country: 'Germany', year: 2015, urbanization: 80.7, lifeExpectancy: 80.6 },
  { country: 'Germany', year: 2020, urbanization: 81.5, lifeExpectancy: 81 },
  { country: 'South Africa', year: 1990, urbanization: 52, lifeExpectancy: 62.9 },
  { country: 'South Africa', year: 1995, urbanization: 53.3, lifeExpectancy: 61.6 },
  { country: 'South Africa', year: 2000, urbanization: 56.3, lifeExpectancy: 58.4 },
  { country: 'South Africa', year: 2005, urbanization: 59.8, lifeExpectancy: null },
  { country: 'South Africa', year: 2010, urbanization: 62.6, lifeExpectancy: 58.9 },
  { country: 'South Africa', year: 2015, urbanization: 63.2, lifeExpectancy: 64.1 },
  { country: 'South Africa', year: 2020, urbanization: 63.4, lifeExpectancy: 65.2 },
];
