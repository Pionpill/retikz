import { StripChart } from '@retikz/chart-react/point';

import { stripPalmerPenguinsData } from './strip-palmer-penguins.data';

/** 绘制示例图形 */
export const renderStripMinimalPreview = (dimensions: { width: number; height: number } | undefined) => (
  <StripChart
    layout={dimensions}
    rows={stripPalmerPenguinsData}
    recipe={{
      encodings: {
        x: { field: 'species', scale: { operation: { type: 'point', name: 'species' } } },
        y: {
          field: 'flipperLengthMm',
          scale: { operation: { type: 'linear', name: 'flipperLength' } },
        },
      },
    }}
  />
);
