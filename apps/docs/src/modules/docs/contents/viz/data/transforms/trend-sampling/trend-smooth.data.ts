import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataSmoothTransform } from '@retikz/data';

import { trendRowsOf } from './trend-sampling.data';

/** 本节控件对应的变换参数 */
export type TrendSmoothValues = { grouped: boolean; method: string; samples: number; extended: boolean };
/** 计算与展示共用同一组输入 */
export const trendSmoothRowsOf = (): Array<ExternalRow> => {
  return trendRowsOf();
};
/** 使用公开 kind / params 声明实际变换 */
export const trendSmoothOperationOf = (values: TrendSmoothValues): IRDataSmoothTransform => ({
  kind: 'smooth',
  params: {
    x: 'x',
    y: 'y',
    groupBy: values.grouped ? ['team'] : [],
    method: { kind: values.method === 'quadratic' ? 'quadratic' : 'linear' },
    sampleCount: values.samples,
    extent: values.extended ? [0, 4] : undefined,
    xAs: 'trendX',
    yAs: 'trendY',
  },
});
/** 执行当前控件对应的真实变换 */
export const trendSmoothResultOf = (values: TrendSmoothValues): Array<ExternalRow> =>
  applyTransforms(trendSmoothRowsOf(), [trendSmoothOperationOf(values)]).rows;
