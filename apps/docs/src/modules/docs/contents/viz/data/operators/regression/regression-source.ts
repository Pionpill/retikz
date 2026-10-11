import type { PreviewSourceConfig } from '@/modules/docs/preview';

import type { RegressionValues } from './regression-samples.data';
import { regressionMethodOf, regressionSamplesOf } from './regression-samples.data';

/** 从相同方法声明与观测派生可复制的 Data 调用，不序列化运行时模型 */
export const regressionSourceOf = (
  method: string,
  values: RegressionValues,
  source: PreviewSourceConfig,
): PreviewSourceConfig => ({
  ...source,
  buildViews: () => {
    const methodCode = JSON.stringify(regressionMethodOf(method, values.order), null, 2);
    const rowsCode = JSON.stringify(regressionSamplesOf(values.tail), null, 2);
    return {
      vanilla: {
        files: [
          {
            filename: `regression-${method}.vanilla.ts`,
            lang: 'ts',
            code: [
              "import { resolveRegression } from '@retikz/data';",
              "import type { IRRegressionMethod } from '@retikz/data';",
              '',
              `const rows = ${rowsCode};`,
              `const method = ${methodCode} satisfies IRRegressionMethod;`,
              'const regression = resolveRegression(method);',
              'const extent: [number, number] = [rows[0].x, rows[rows.length - 1].x];',
              'regression.validateExtent(extent);',
              'const model = regression.fit(rows);',
              '',
              'export const fittedRows = rows.map(row => ({ ...row, fittedY: model.predict(row.x) }));',
              `const sampleCount = ${values.sampleCount};`,
              'export const curveRows = Array.from({ length: sampleCount }, (_, index) => {',
              '  const x = extent[0] + (extent[1] - extent[0]) * index / (sampleCount - 1);',
              '  return { trendX: x, trendY: model.predict(x) };',
              '});',
            ].join('\n'),
          },
        ],
      },
      ir: {
        files: [{ filename: `regression-${method}.method.json`, code: methodCode, lang: 'json' }],
      },
    };
  },
});
