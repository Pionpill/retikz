import { BubbleChart } from '@retikz/chart-react/point';

import type { Lang } from '@/i18n';

import { gapminderBubbleData } from './bubble-basic.data';
import { bubbleFacetI18n } from './bubble-facet.i18n';

/** 分面气泡图的图形参数 */
export type BubbleFacetPreviewOptions = {
  lang: Lang;
  dimensions?: { width: number; height: number };
  header: boolean;
  panelGap: number;
  fillOpacity: number;
};

/** 按大洲分面比较收入、寿命和人口规模 */
export const renderBubbleFacetPreview = (options: BubbleFacetPreviewOptions) => {
  const { lang, dimensions, header, panelGap, fillOpacity } = options;
  const text = bubbleFacetI18n[lang];
  const bounds = dimensions ?? { width: 720, height: 568 };

  return (
    <BubbleChart
      rows={gapminderBubbleData}
      layout={{ ...bounds, padding: { right: 48, bottom: 32 } }}
      presentation={{ title: { text: text.title }, subtitle: { text: text.subtitle } }}
      recipe={{
        encodings: {
          x: { field: 'gdpPerCapita', scale: { operation: { type: 'log', name: 'income' } } },
          y: 'lifeExpectancy',
          size: 'population',
          color: 'continent',
          row: 'continent',
          facet: { header: { row: header }, spacing: { panelGap } },
        },
        properties: { fillOpacity },
      }}
    />
  );
};
