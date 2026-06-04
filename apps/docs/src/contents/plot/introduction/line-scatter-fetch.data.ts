import { useEffect, useState } from 'react';

/**
 * 外部数据源：vega-datasets 经典「汽车性能」数据集（~400 行），经 jsDelivr CDN 提供
 * @description jsDelivr 全球（Cloudflare / Fastly 边缘）+ 国内可达、CORS 全开、免 key，
 *   适合演示从外部站点拉一份较大真实数据集再作图。换数据源改这一行即可
 */
const ENDPOINT = 'https://cdn.jsdelivr.net/npm/vega-datasets@2/data/cars.json';

/** 一行数据：马力 + 每加仑英里数（油耗），用于散点 */
export type CarPerformance = { horsepower: number; mpg: number };

/** 原始行：部分车型的 Horsepower / Miles_per_Gallon 缺失（null），取数时过滤掉 */
type CarRow = { Horsepower: number | null; Miles_per_Gallon: number | null };

/**
 * 远程数据获取 + 清洗封装成 hook，主 demo 只消费 `{ data, error }`，不碰 fetch / 状态 / 清洗
 * @description React 端的数据获取写法；命令式 / SSR 的 vanilla 端无法复用 hook，需另写独立取数文件
 */
export const useCarPerformance = (): { data: Array<CarPerformance> | null; error: string | null } => {
  const [data, setData] = useState<Array<CarPerformance> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(ENDPOINT)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Array<CarRow>>;
      })
      .then(rows => {
        if (!alive) return;
        const cleaned = rows
          .filter(
            (row): row is { Horsepower: number; Miles_per_Gallon: number } =>
              typeof row.Horsepower === 'number' && typeof row.Miles_per_Gallon === 'number',
          )
          .map(row => ({ horsepower: row.Horsepower, mpg: row.Miles_per_Gallon }));
        setData(cleaned);
      })
      .catch((reason: unknown) => {
        if (alive) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      alive = false;
    };
  }, []);

  return { data, error };
};
