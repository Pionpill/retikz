import type { IRRegressionMethod } from '@retikz/data';
import { BuiltinRegressionMethod, resolveRegression } from '@retikz/data';

/** 六种拟合方式共用的正值观测 */
export const regressionSamples = [
  { x: 1, y: 2 },
  { x: 2, y: 3 },
  { x: 3, y: 4 },
  { x: 4, y: 4 },
  { x: 5, y: 6 },
  { x: 6, y: 10 },
  { x: 7, y: 16 },
  { x: 8, y: 21 },
  { x: 9, y: 33 },
];

/** 展示方式、模型阶数与曲线采样控件；拟合方式由小节固定 */
export type RegressionValues = {
  /** 图形或表格视图 */
  display: string;
  /** 仅多项式使用的阶数；省略时由方法 Schema 提供默认值 */
  order?: number;
  /** 图形的等距采样点数 */
  sampleCount: number;
  /** x=9 处的观测 y */
  tail: number;
};

/** 仅调整末次观测，保持其余点和坐标范围不变 */
export const regressionSamplesOf = (tail: number) =>
  regressionSamples.map(row => ({ ...row, y: row.x === 9 ? tail : row.y }));

/** 方法参数由 Data 的公开拟合入口解析 */
export const regressionMethodOf = (method: string, order?: number): IRRegressionMethod =>
  method === BuiltinRegressionMethod.Polynomial && order !== undefined ? { kind: method, order } : { kind: method };

/** 同一个模型在原始 x 上求值，并按展示需要采样曲线；不向观测追加行 */
export const regressionDataOf = (method: string, values: RegressionValues) => {
  const rows = regressionSamplesOf(values.tail);
  const regression = resolveRegression(regressionMethodOf(method, values.order));
  const extent: [number, number] = [rows[0].x, rows[rows.length - 1].x];
  regression.validateExtent(extent);
  const model = regression.fit(rows);
  const fittedRows = rows.map(row => ({ ...row, fittedY: model.predict(row.x) }));
  const curveRows =
    values.display === 'graph'
      ? Array.from({ length: values.sampleCount }, (_, index) => {
          const x = extent[0] + ((extent[1] - extent[0]) * index) / (values.sampleCount - 1);
          return { trendX: x, trendY: model.predict(x) };
        })
      : [];
  return { rows, fittedRows, curveRows };
};
