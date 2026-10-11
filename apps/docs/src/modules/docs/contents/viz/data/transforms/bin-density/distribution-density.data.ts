import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataDensityTransform } from '@retikz/data';

import { distributionRowsOf } from './bin-density.data';

/** 本节控件对应的变换参数 */
export type DistributionDensityValues = { grouped: boolean; bandwidth: string; width: number; samples: number };
/** 计算与展示共用同一组输入 */
export const distributionDensityRowsOf = (): Array<ExternalRow> => {
  return distributionRowsOf();
};
/** 使用公开 kind / params 声明实际变换 */
export const distributionDensityOperationOf = (values: DistributionDensityValues): IRDataDensityTransform => ({
  kind: 'density',
  params: {
    field: 'value',
    groupBy: values.grouped ? ['team'] : [],
    bandwidth: values.bandwidth === 'value' ? { kind: 'value', value: values.width } : { kind: 'silverman' },
    sampleCount: values.samples,
    extent: [0, 60],
    xAs: 'sample',
    densityAs: 'density',
  },
});
/** 执行当前控件对应的真实变换 */
export const distributionDensityResultOf = (values: DistributionDensityValues): Array<ExternalRow> =>
  applyTransforms(distributionDensityRowsOf(), [distributionDensityOperationOf(values)]).rows;
