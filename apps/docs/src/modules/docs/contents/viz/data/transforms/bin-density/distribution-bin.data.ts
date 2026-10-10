import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataBinTransform } from '@retikz/data';

import { distributionRowsOf } from './bin-density.data';

/** 本节控件对应的变换参数 */
export type DistributionBinValues = { grouped: boolean; strategy: string; count: number; step: number };
/** 计算与展示共用同一组输入 */
export const distributionBinRowsOf = (): Array<ExternalRow> => {
  return distributionRowsOf();
};
/** 使用公开 kind / params 声明实际变换 */
export const distributionBinOperationOf = (values: DistributionBinValues): IRDataBinTransform => ({
  kind: 'bin',
  params: {
    field: 'value',
    groupBy: values.grouped ? ['team'] : [],
    extent: [0, 60],
    nice: false,
    ...(values.strategy === 'step'
      ? { step: values.step }
      : values.strategy === 'thresholds'
        ? { thresholds: [15, 40] }
        : { count: values.count }),
  },
});
/** 执行当前控件对应的真实变换 */
export const distributionBinResultOf = (values: DistributionBinValues): Array<ExternalRow> =>
  applyTransforms(distributionBinRowsOf(), [distributionBinOperationOf(values)]).rows;
