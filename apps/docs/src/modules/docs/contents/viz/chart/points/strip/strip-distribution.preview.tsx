import { StripChart } from '@retikz/chart-react/point';

import type { Lang } from '@/i18n';

import { stripDistributionI18n } from './strip-distribution.i18n';
import { stripVegaBarleyData } from './strip-vega-barley.data';

/** 图形参数 */
export type StripDistributionPreviewValues = {
  size: number;
  opacity: number;
  span: number;
  distribution: 'uniform' | 'normal';
  sigma: number;
  seed: number;
};

/** 绘制示例图形 */
export const renderStripDistributionPreview = (
  lang: Lang,
  dimensions: { width: number; height: number } | undefined,
  values: StripDistributionPreviewValues,
) => {
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
