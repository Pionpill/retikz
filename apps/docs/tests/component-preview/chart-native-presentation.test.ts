import type { ReactElement } from 'react';

import { ScatterChart } from '@retikz/chart-react';
import { readFileSync } from 'node:fs';
import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import type { PreviewSourceConfig } from '../../src/modules/docs/preview';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { previewSource as basicEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.en.demo';
import { previewSource as basicZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.zh.demo';
import { previewSource as incomeLifeExpectancyEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-income-life-expectancy.en.demo';
import { previewSource as incomeLifeExpectancyZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-income-life-expectancy.zh.demo';

const canonicalScatterChartOf = (source: PreviewSourceConfig): ReactElement => {
  const chart = source.canonicalRender?.();
  if (!isValidElement(chart)) throw new Error('Chart preview must provide a canonical React element');
  return chart;
};

describe('Chart-native Scatter presentation', () => {
  it('documents the complete public typed Chart family for React and Vanilla in both languages', () => {
    for (const locale of ['zh', 'en']) {
      const content = readFileSync(
        new URL(`../../src/modules/docs/contents/viz/chart/_includes/shared-api.${locale}.mdx`, import.meta.url),
        'utf8',
      );

      expect(content).toContain('ConnectedScatterChart');
      expect(content).toContain('createConnectedScatterChart');
    }
  });

  it('uses the ScatterChart shorthand path for the World Bank example', () => {
    for (const source of [basicZhPreviewSource, basicEnPreviewSource]) {
      const chart = canonicalScatterChartOf(source);

      expect(chart.type).toBe(ScatterChart);
      const contribution = ScatterChart.embeddableAdapter.contribute(chart.props);
      expect(contribution.node).toMatchObject({
        namespace: 'chart',
        type: 'chart',
        plot: { data: { reference: 'chart.data' } },
        presentation: {
          children: [
            { key: 'chart.presentation.title', preset: 'title' },
            { key: 'chart.presentation.subtitle', preset: 'subtitle' },
            { key: 'chart.plot' },
            { key: 'chart.presentation.source', preset: 'source' },
          ],
        },
      });
    }
  });

  it('preserves the authored headless-marker order for the Gapminder example', () => {
    for (const source of [incomeLifeExpectancyZhPreviewSource, incomeLifeExpectancyEnPreviewSource]) {
      const chart = canonicalScatterChartOf(source);

      expect(chart.type).toBe(ScatterChart);
      const contribution = ScatterChart.embeddableAdapter.contribute(chart.props);
      expect(contribution.node).toMatchObject({
        namespace: 'chart',
        type: 'chart',
        plot: { data: { reference: 'chart.data' } },
        presentation: {
          children: [
            { key: 'chart.presentation.subtitle', preset: 'subtitle' },
            { key: 'chart.presentation.title', preset: 'title' },
            { key: 'chart.plot' },
            { key: 'chart.presentation.source', preset: 'source' },
            { key: 'chart.presentation.note', preset: 'note' },
          ],
        },
      });
    }
  });

  it('generates reusable Vanilla source and SVG from the real Scatter datasets', () => {
    const cases = [
      [basicZhPreviewSource, './scatter-basic.data'],
      [incomeLifeExpectancyZhPreviewSource, './scatter-income-life-expectancy.data'],
    ] as const;

    for (const [source, datasetModule] of cases) {
      const preview = buildPreviewIR(() => source.canonicalRender?.() ?? null);
      const vanilla = buildVanillaPreview(preview, { datasetImports: source.datasetImports });

      expect(vanilla.code).toContain(`import { countryScatterData } from '${datasetModule}';`);
      expect(vanilla.code).toContain("from '@retikz/chart-vanilla'");
      expect(vanilla.svg).toContain('<svg');
    }
  });

  it('renders a selected docs Chart theme style through the Vanilla preview path', () => {
    const preview = buildPreviewIR(() => basicZhPreviewSource.canonicalRender?.() ?? null);
    const vanilla = buildVanillaPreview(preview, {
      datasetImports: basicZhPreviewSource.datasetImports,
      theme: { mode: 'light', style: 'academic' },
    });

    expect(vanilla.svg).toContain('<svg');
    expect(vanilla.code).toContain(
      "import { PreviewThemeDefinitionBundle } from '@/modules/docs/components/component-preview/theme';",
    );
    expect(vanilla.code).toContain("style: 'academic'");
    expect(vanilla.code).toContain('themeStyles: PreviewThemeDefinitionBundle.core');
    expect(vanilla.code).toContain('chartThemeStyles: PreviewThemeDefinitionBundle.chart');
    expect(vanilla.code).toContain('plotThemeStyles: PreviewThemeDefinitionBundle.plot');
  });
});
