/** Open-Meteo 东京日出日落查询，时间采用 Asia/Tokyo */
export const RANGED_DOT_DAYLIGHT_SOURCE_URL =
  'https://archive-api.open-meteo.com/v1/archive?latitude=35.68&longitude=139.76&start_date=2024-01-15&end_date=2024-12-15&daily=sunrise,sunset&timezone=Asia%2FTokyo';

/** Open-Meteo 返回结果的隔月 15 日快照，访问日期 2026-09-28 */
const daylightTimes = [
  { date: '2024-01-15', sunrise: '06:50', sunset: '16:49' },
  { date: '2024-03-15', sunrise: '05:51', sunset: '17:48' },
  { date: '2024-05-15', sunrise: '04:35', sunset: '18:38' },
  { date: '2024-07-15', sunrise: '04:36', sunset: '18:56' },
  { date: '2024-09-15', sunrise: '05:23', sunset: '17:47' },
  { date: '2024-11-15', sunrise: '06:16', sunset: '16:33' },
] as const;

/** 把本地 HH:MM 时刻转换为 24 小时尺度上的数值 */
const clockHour = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
};

/** 月份标签用于径向类别，时刻数值用于共享角度尺度 */
export const rangedDotDaylightData = daylightTimes.map(row => ({
  ...row,
  month: row.date.slice(5, 7),
  sunriseHour: clockHour(row.sunrise),
  sunsetHour: clockHour(row.sunset),
}));
