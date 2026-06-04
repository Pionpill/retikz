import { LineMark, Plot } from '@retikz/plot-react';
import { type FC, useEffect, useState } from 'react';

/**
 * 外部数据源：Open-Meteo 逐小时气温（免 key、CORS 全开）
 * @description 演示从「别的站点」fetch 一个较大的真实数据集再作图——数据量大、不进 IR，<Plot> 只拿到裸数据行。
 *   换数据源时改这一行即可
 */
const ENDPOINT =
  'https://api.open-meteo.com/v1/forecast?latitude=31.23&longitude=121.47&hourly=temperature_2m&past_days=7&forecast_days=0';

/** 一行数据：第 N 个小时 + 当时气温 */
type HourlyTemperature = { hour: number; temperature: number };

const Demo: FC = () => {
  const [data, setData] = useState<Array<HourlyTemperature> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(ENDPOINT)
      .then(response => response.json())
      .then((json: { hourly: { temperature_2m: Array<number> } }) => {
        if (!alive) return;
        setData(json.hourly.temperature_2m.map((temperature, hour) => ({ hour, temperature })));
      })
      .catch((reason: unknown) => {
        if (alive) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <div className="text-sm text-muted-foreground">加载失败：{error}</div>;
  if (!data) return <div className="text-sm text-muted-foreground">加载中…</div>;

  // 拿到外部数据后，作图写法与本地数据完全一致——数据来自哪里对 <Plot> 透明
  return (
    <Plot data={data} width={480} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
      <LineMark x="hour" y="temperature" order="hour" />
    </Plot>
  );
};

export default Demo;
