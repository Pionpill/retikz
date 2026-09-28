import { RegressionChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { fixedSlopeFit } from './regression-custom-fit';
import { createPreviewControlContract } from './regression-custom.controls';
import { fixedSlopeRows } from './regression-custom.data';

const lowerOptions = { regressionDefinitions: [fixedSlopeFit] };
const contract = createPreviewControlContract();

/** 自定义拟合示例参数 */
export type RegressionCustomProps = { lang?: Lang };

/** 通过注册的固定斜率算法绘制拟合线 */
const RegressionCustom: FC<RegressionCustomProps> = props => {
  const { lang = 'zh' } = props;
  const { slope } = usePreviewControls(createPreviewControlContract(lang).controls);
  const dimensions = usePreviewDimensions();
  return (
    <RegressionChart
      rows={fixedSlopeRows}
      lowerOptions={lowerOptions}
      layout={dimensions}
      recipe={{
        encodings: { x: 'x', y: 'y' },
        properties: {
          method: { kind: 'fixed-slope', slope },
          point: { size: 6 },
          trend: { stroke: 'darkorange', strokeWidth: 2 },
        },
      }}
    />
  );
};

/** 运行时 Definition 通过 React 宿主注入 */
export const previewSource = { deriveIR: false };
export { createPreviewControlContract } from './regression-custom.controls';
export const previewControls = contract.controls;
export default RegressionCustom;
