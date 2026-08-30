import type { ReactElement } from 'react';

import { ScatterChart } from '@retikz/chart-react/point';
import { readFileSync } from 'node:fs';
import { createElement, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import type { PreviewSourceConfig } from '../../src/modules/docs/preview';

import { buildPreviewIR, previewEmbedPropsOf } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { CHART_PRESENTATION_CONTROL_IDS } from '../../src/modules/docs/contents/viz/chart/model/presentation/chart-presentation.constants';
import { previewControlContract as presentationLayoutZhContract } from '../../src/modules/docs/contents/viz/chart/model/presentation/chart-presentation-layout.controls';
import { previewControlContract as presentationLayoutEnContract } from '../../src/modules/docs/contents/viz/chart/model/presentation/chart-presentation-layout.en.controls';
import {
  ChartPresentationLayoutPreview,
  ChartPresentationVisibilityPreview,
} from '../../src/modules/docs/contents/viz/chart/model/presentation/chart-presentation-preview';
import { previewControlContract as presentationVisibilityZhContract } from '../../src/modules/docs/contents/viz/chart/model/presentation/chart-presentation-visibility.controls';
import { previewControlContract as presentationVisibilityEnContract } from '../../src/modules/docs/contents/viz/chart/model/presentation/chart-presentation-visibility.en.controls';
import { previewSource as presentationVisibilityZhSource } from '../../src/modules/docs/contents/viz/chart/model/presentation/chart-presentation-visibility.zh.demo';
import { previewSource as fertilityWorkEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.en.demo';
import { previewSource as fertilityWorkZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.zh.demo';
import { previewSource as penguinFacetEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.en.demo';
import { previewSource as penguinFacetZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.zh.demo';
import { previewSource as worldCupEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.en.demo';
import { previewSource as worldCupZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.zh.demo';

const canonicalScatterChartOf = (source: PreviewSourceConfig): ReactElement => {
  const chart = source.canonicalRender?.();
  if (!isValidElement(chart)) throw new Error('Chart preview must provide a canonical React element');
  return chart;
};

const scatterContributionOf = (chart: ReactElement) =>
  ScatterChart.inputEmbedAdapter.lower(
    ScatterChart.createInputEmbedProps(previewEmbedPropsOf(ScatterChart, chart.props)),
    {
      id: 'chart',
      kind: ScatterChart.inputEmbedAdapter.kind,
      layerId: 'main',
      identityPath: ['main', 'chart'],
    },
  );

type ControlSections = ReadonlyArray<Readonly<{ controls: ReadonlyArray<Readonly<{ id: string }>> }>>;

/** 只比较本地化 controls 的稳定字段 id */
const controlIdsOf = (sections: ControlSections): Array<string> =>
  sections.flatMap(section => section.controls.map(control => control.id));

describe('Chart-native Scatter presentation', () => {
  it('keeps the bilingual Presentation control contracts structurally aligned', () => {
    expect(controlIdsOf(presentationLayoutZhContract.controls.sections)).toEqual(
      controlIdsOf(presentationLayoutEnContract.controls.sections),
    );
    expect(presentationLayoutZhContract.canonicalValues).toEqual(presentationLayoutEnContract.canonicalValues);
    expect('stateOnlyIds' in presentationLayoutZhContract).toBe(false);
    expect(controlIdsOf(presentationVisibilityZhContract.controls.sections)).toEqual(
      controlIdsOf(presentationVisibilityEnContract.controls.sections),
    );
    expect(presentationVisibilityZhContract.canonicalValues).toEqual(presentationVisibilityEnContract.canonicalValues);
    expect(presentationVisibilityZhContract.canonicalValues).toEqual({
      [CHART_PRESENTATION_CONTROL_IDS.showTitle]: true,
      [CHART_PRESENTATION_CONTROL_IDS.showSubtitle]: true,
      [CHART_PRESENTATION_CONTROL_IDS.showNote]: true,
      [CHART_PRESENTATION_CONTROL_IDS.showSource]: true,
    });
  });

  it('derives concise Chart Source with every presentation slot from the canonical state', () => {
    const preview = buildPreviewIR(() => presentationVisibilityZhSource.canonicalRender?.() ?? null);

    expect(preview.ir.children).toEqual([
      expect.objectContaining({
        namespace: 'chart',
        type: 'point',
        recipe: expect.objectContaining({ chartType: 'scatter' }),
        presentation: expect.objectContaining({
          title: expect.anything(),
          subtitle: expect.anything(),
          note: expect.anything(),
          source: expect.anything(),
        }),
      }),
    ]);
  });

  it('keeps the presentation playground on automatic framing', () => {
    const preview = buildPreviewIR(() =>
      createElement(ChartPresentationLayoutPreview, {
        copy: {
          title: 'Title',
          subtitle: 'Subtitle',
          note: 'Note',
          source: 'Source',
        },
        inspect: false,
      }),
    );

    expect(preview.ir.viewBox).toBeUndefined();
  });

  it('uses the shared host size and stable framing for the presentation visibility playground', () => {
    const preview = buildPreviewIR(() =>
      createElement(ChartPresentationVisibilityPreview, {
        copy: {
          title: 'Title',
          subtitle: 'Subtitle',
          note: 'Note',
          source: 'Source',
        },
        showTitle: false,
        showSubtitle: true,
        showNote: true,
        showSource: true,
      }),
    );

    expect(preview).toMatchObject({ width: 440, height: 360 });
    expect(preview.ir.viewBox).toEqual({ x: -10, y: -10, width: 393.4, height: 345.2 });
  });

  it('keeps Plot and omits presentation when every shorthand is disabled', () => {
    const preview = buildPreviewIR(() =>
      createElement(ChartPresentationVisibilityPreview, {
        copy: {
          title: 'Title',
          subtitle: 'Subtitle',
          note: 'Note',
          source: 'Source',
        },
        showTitle: false,
        showSubtitle: false,
        showNote: false,
        showSource: false,
      }),
    );

    expect(preview.ir.children).toEqual([
      expect.objectContaining({
        namespace: 'chart',
        type: 'point',
        recipe: expect.objectContaining({ chartType: 'scatter' }),
      }),
    ]);
    expect(preview.ir.children[0]).not.toHaveProperty('presentation');
  });

  it('documents the complete public multi-entry Chart APIs for React and Vanilla in both languages', () => {
    for (const locale of ['zh', 'en']) {
      const authoring = readFileSync(
        new URL(`../../src/modules/docs/contents/viz/chart/model/authoring/index.${locale}.mdx`, import.meta.url),
        'utf8',
      );
      const structure = readFileSync(
        new URL(`../../src/modules/docs/contents/viz/chart/model/structure/index.${locale}.mdx`, import.meta.url),
        'utf8',
      );
      const content = `${structure}\n${authoring}`;

      expect(content).toContain('@retikz/chart/point/scatter');
      expect(content).toContain('@retikz/chart-react/point');
      expect(content).not.toContain('@retikz/chart-react/point/');
      expect(content).toContain('@retikz/chart-vanilla/point/scatter');
    }
  });

  it('uses the ScatterChart shorthand path for the World Bank example', () => {
    for (const source of [fertilityWorkZhPreviewSource, fertilityWorkEnPreviewSource]) {
      const chart = canonicalScatterChartOf(source);

      expect(chart.type).toBe(ScatterChart);
      const contribution = scatterContributionOf(chart);
      expect(contribution.node).toMatchObject({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'chart.data' },
        recipe: { chartType: 'scatter' },
        presentation: {
          title: expect.anything(),
          subtitle: expect.anything(),
          source: expect.anything(),
        },
      });
    }
  });

  it('generates reusable Vanilla source and SVG from the real Scatter datasets', () => {
    const cases = [
      [fertilityWorkZhPreviewSource, './scatter-fertility-work.data', 'fertilityWorkData'],
      [fertilityWorkEnPreviewSource, './scatter-fertility-work.data', 'fertilityWorkData'],
      [penguinFacetZhPreviewSource, './scatter-penguins-facet-jitter.data', 'penguinScatterData'],
      [penguinFacetEnPreviewSource, './scatter-penguins-facet-jitter.data', 'penguinScatterData'],
      [worldCupZhPreviewSource, './scatter-world-cup-shots.data', 'messiWorldCupShots'],
      [worldCupEnPreviewSource, './scatter-world-cup-shots.data', 'messiWorldCupShots'],
    ] as const;

    for (const [source, datasetModule, datasetExport] of cases) {
      const preview = buildPreviewIR(() => source.canonicalRender?.() ?? null);
      const vanilla = buildVanillaPreview(preview, { datasetImports: source.datasetImports });

      expect(vanilla.code).toContain(`import { ${datasetExport} } from '${datasetModule}';`);
      expect(vanilla.code).not.toContain('const datasets =');
      expect(vanilla.code).toContain("import { renderChart } from '@retikz/chart-vanilla';");
      expect(vanilla.code).toContain("import { createScatterChart } from '@retikz/chart-vanilla/point/scatter';");
      expect(vanilla.code).not.toContain('markDefinitions: [scatterMarkDefinition]');
      expect(vanilla.svg).toContain('<svg');
    }
  });

  it('passes the preview text measurer into the Vanilla Chart compile path', () => {
    const preview = buildPreviewIR(() => fertilityWorkZhPreviewSource.canonicalRender?.() ?? null);
    let measureCalls = 0;
    const vanilla = buildVanillaPreview(preview, {
      measureText: (text, font) => {
        measureCalls += 1;
        return { width: text.length * font.size, height: font.size };
      },
    });

    expect(measureCalls).toBeGreaterThan(0);
    expect(vanilla.svg).toContain('<svg');
  });

  it('renders a selected docs Chart theme style through the Vanilla preview path', () => {
    const preview = buildPreviewIR(() => fertilityWorkZhPreviewSource.canonicalRender?.() ?? null);
    const vanilla = buildVanillaPreview(preview, {
      datasetImports: fertilityWorkZhPreviewSource.datasetImports,
      theme: { mode: 'light', style: 'academic' },
    });

    expect(vanilla.svg).toContain('<svg');
    expect(vanilla.code).toContain(
      "import { PreviewThemeDefinitionBundle } from '@/modules/docs/components/component-preview/theme';",
    );
    expect(vanilla.code).toContain("style: 'academic'");
    expect(vanilla.code).toContain('themeStyles: PreviewThemeDefinitionBundle.core');
    expect(vanilla.code).toContain('themeDefinitions: PreviewThemeDefinitionBundle.chart');
    expect(vanilla.code).toContain('plotThemeStyles: PreviewThemeDefinitionBundle.plot');
  });
});
