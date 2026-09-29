import { StripChart } from '@retikz/chart-react/point';

import type { Lang } from '@/i18n';

import { stripPlacementFigureData } from './strip-placement-figure.data';
import { stripPlacementFigureI18n } from './strip-placement-figure.i18n';

/** 绘制示例图形 */
export const renderStripPlacementFigurePreview = (
  lang: Lang,
  dimensions: { width: number; height: number } | undefined,
) => {
  const text = stripPlacementFigureI18n[lang];
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <StripChart
      rows={stripPlacementFigureData}
      layout={bounds}
      presentation={{ title: { text: text.title }, subtitle: { text: text.subtitle } }}

      recipe={{
        encodings: {
          x: { field: 'group', scale: { operation: { type: 'point', name: 'group' } } },
          y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
        },
        properties: { size: 7, opacity: 0.6, jitter: { span: { kind: 'ratio', value: 0.5 }, seed: 7 } },
      }}
    />
  );
  return chart;
};
