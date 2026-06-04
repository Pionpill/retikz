import type { PlotSpec } from '@retikz/plot';
import { renderPlot } from '@retikz/plot-vanilla';

/** 外部数据源：Open-Meteo 逐小时气温（免 key、CORS 全开） */
const ENDPOINT =
  'https://api.open-meteo.com/v1/forecast?latitude=31.23&longitude=121.47&hourly=temperature_2m&past_days=7&forecast_days=0';

/** vanilla 暂无组合 DSL，直接写规范化 Plot IR（与 React 端 <Plot>{marks} 装配出的等价） */
const spec: PlotSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { ref: 'hourly' },
  scales: [
    { type: 'linear', name: 'xHour' },
    { type: 'linear', name: 'yTemperature' },
  ],
  coordinate: { type: 'cartesian2D', x: 'xHour', y: 'yTemperature' },
  marks: [{ type: 'line', order: 'hour', encoding: { x: { field: 'hour' }, y: { field: 'temperature' } } }],
};

/** 数据来自哪里对 renderPlot 透明：先 fetch、拿到裸数据行后照样喂 renderPlot 出 SVG 串（SSR / 零 DOM） */
export const renderTemperatureChart = async (): Promise<string> => {
  const json: { hourly: { temperature_2m: Array<number> } } = await fetch(ENDPOINT).then(response => response.json());
  const hourly = json.hourly.temperature_2m.map((temperature, hour) => ({ hour, temperature }));
  return renderPlot(spec, { hourly }, { width: 480, height: 220 });
};
