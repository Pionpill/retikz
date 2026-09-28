import { StripChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { stripDistributionI18n } from './strip-distribution.i18n';
import { stripVegaBarleyData } from './strip-vega-barley.data';

/** 示例的语言参数 */
export type StripDistributionProps = { lang?: Lang };

import { createPreviewControlContract } from './strip-distribution.controls';
import type { DemoValues } from './strip-distribution.controls';

const contract = createPreviewControlContract();

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (lang: Lang, dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) => {
  const text = stripDistributionI18n[lang];
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <StripChart
      rows={stripVegaBarleyData}
      coordinate={{ type: 'polar2D' }}
      layout={bounds}
      presentation={{ title: { text: text.title }, subtitle: { text: text.subtitle } }}

      recipe={{
        encodings: {
          x: { field: 'site', scale: { operation: { type: 'point', name: 'site' } } },
          y: { field: 'yield', scale: { operation: { type: 'linear', name: 'yield' } } },
        },
        properties: {
          size: values.size,
          opacity: values.opacity,
          jitter: {
            span: { kind: 'ratio', value: values.span },
            distribution:
              values.distribution === 'normal' ? { kind: 'normal', sigma: values.sigma } : { kind: 'uniform' },
            seed: values.seed,
          },
        },
      }}
    />
  );
  return chart;
};

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: (lang: Lang = 'zh') => render(lang),
  datasetImports: { 'chart.data': { name: 'stripVegaBarleyData', from: './strip-vega-barley.data' } },
};

/** 随演示区域重新布局 */
const StripDistribution: FC<StripDistributionProps> = props => {
  const { lang = 'zh' } = props;
  return render(lang, usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default StripDistribution;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './strip-distribution.controls';
export const previewControls = contract.controls;
