import { StripChart, StripMark } from '@retikz/chart-react/point';

import { stripVegaBarleyData } from './strip-vega-barley.data';

/** 图形参数 */
export type StripMarksPreviewValues = {
  shape: 'diamond' | 'circle' | 'rectangle';
  size: number;
};

/** 绘制示例图形 */
export const renderStripMarksPreview = (
  dimensions: { width: number; height: number } | undefined,
  values: StripMarksPreviewValues,
) => {
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <StripChart
      rows={stripVegaBarleyData}
      layout={bounds}

      recipe={{
        encodings: {
          x: { field: 'site', scale: { operation: { type: 'point', name: 'site' } } },
          y: { field: 'yield', scale: { operation: { type: 'linear', name: 'yield' } } },
        },
        properties: { size: 4, opacity: 0.6 },
      }}
    >
      <StripMark
        override
        properties={{
          jitter: {
            span: { kind: 'ratio', value: 0.6 },
            distribution: { kind: 'normal', sigma: 0.4 },
            seed: 7,
          },
          shape: values.shape,
          size: values.size,
        }}
      />
    </StripChart>
  );

  return chart;
};
