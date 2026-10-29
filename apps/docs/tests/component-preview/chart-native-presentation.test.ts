import { ScatterChart } from '@retikz/chart-react/point';
import type { ReactElement } from 'react';
import { createElement, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import { buildPreviewIR, previewEmbedPropsOf } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { previewControlContract as presentationLayoutZhContract } from '../../src/modules/docs/contents/viz/chart/model/general-structure/chart-presentation-layout.controls';
import { previewControlContract as presentationLayoutEnContract } from '../../src/modules/docs/contents/viz/chart/model/general-structure/chart-presentation-layout.en.controls';
import { previewSource as presentationLayoutZhSource } from '../../src/modules/docs/contents/viz/chart/model/general-structure/chart-presentation-layout.zh.demo';
import { ChartPresentationLayoutPreview } from '../../src/modules/docs/contents/viz/chart/model/general-structure/chart-presentation-preview';
import { CHART_PRESENTATION_CONTROL_IDS } from '../../src/modules/docs/contents/viz/chart/model/general-structure/chart-presentation.constants';
import { previewSource as fertilityWorkEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.en.demo';
import { previewSource as fertilityWorkZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.zh.demo';
import { previewSource as worldCupEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.en.demo';
import { previewSource as worldCupZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.zh.demo';
import type { PreviewSourceConfig } from '../../src/modules/docs/preview';

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

describe('Chart 原生 Scatter 呈现', () => {
  it('保持双语 Presentation 控件契约的结构一致', () => {
    expect(controlIdsOf(presentationLayoutZhContract.controls.sections)).toEqual(
      controlIdsOf(presentationLayoutEnContract.controls.sections),
    );
    expect(presentationLayoutZhContract.canonicalValues).toEqual(presentationLayoutEnContract.canonicalValues);
    expect('stateOnlyIds' in presentationLayoutZhContract).toBe(false);
    expect(presentationLayoutZhContract.canonicalValues).toEqual({
      [CHART_PRESENTATION_CONTROL_IDS.showTitle]: true,
      [CHART_PRESENTATION_CONTROL_IDS.showSubtitle]: true,
      [CHART_PRESENTATION_CONTROL_IDS.showNote]: true,
      [CHART_PRESENTATION_CONTROL_IDS.showSource]: true,
    });
  });

  it('从规范状态推导包含所有呈现槽位的精简 Chart Source', () => {
    const preview = buildPreviewIR(() => presentationLayoutZhSource.canonicalRender?.() ?? null);

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

  it('呈现交互演示使用自动取景', () => {
    const preview = buildPreviewIR(() =>
      createElement(ChartPresentationLayoutPreview, {
        copy: {
          title: 'Title',
          subtitle: 'Subtitle',
          note: 'Note',
          source: 'Source',
        },
      }),
    );

    expect(preview.ir.viewBox).toBeUndefined();
  });

  it('Chart 随展示视口扩展', () => {
    const preview = buildPreviewIR(() =>
      createElement(ChartPresentationLayoutPreview, {
        copy: { title: 'Title', subtitle: 'Subtitle', note: 'Note', source: 'Source' },
        dimensions: { width: 800, height: 408 },
      }),
    );

    expect(preview.ir.viewBox).toBeUndefined();
    expect(preview.ir.children[0]).toMatchObject({ layout: { width: 776, height: 384 } });
  });

  it('当每个简写被禁用时，保留 Plot 并省略显示', () => {
    const preview = buildPreviewIR(() =>
      createElement(ChartPresentationLayoutPreview, {
        copy: {
          title: 'Title',
          subtitle: 'Subtitle',
          note: 'Note',
          source: 'Source',
        },
        visibility: { title: false, subtitle: false, note: false, source: false },
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

  it('世界银行示例使用不含呈现配置的 ScatterChart 简写', () => {
    for (const source of [fertilityWorkZhPreviewSource, fertilityWorkEnPreviewSource]) {
      const chart = canonicalScatterChartOf(source);

      expect(chart.type).toBe(ScatterChart);

      const contribution = scatterContributionOf(chart);

      expect(contribution.node).toMatchObject({
        namespace: 'chart',
        type: 'point',
        data: { reference: 'chart.data' },
        recipe: { chartType: 'scatter' },
      });
      expect(contribution.node).not.toHaveProperty('presentation');
    }
  });

  it('从真实的 Scatter 数据集生成可重用的 Vanilla 源和 SVG', () => {
    const cases = [
      [fertilityWorkZhPreviewSource, './scatter-fertility-work.data', 'fertilityWorkData'],
      [fertilityWorkEnPreviewSource, './scatter-fertility-work.data', 'fertilityWorkData'],
      [worldCupZhPreviewSource, './scatter-world-cup-shots.data', 'messiWorldCupShots'],
      [worldCupEnPreviewSource, './scatter-world-cup-shots.data', 'messiWorldCupShots'],
    ] as const;

    for (const [source, datasetModule, datasetExport] of cases) {
      const preview = buildPreviewIR(() => source.canonicalRender?.() ?? null);
      const vanilla = buildVanillaPreview(preview, { datasetImports: source.datasetImports });

      expect(vanilla.code).toContain(`import { ${datasetExport} } from '${datasetModule}';`);
      expect(vanilla.code).not.toContain('const datasets =');
      expect(vanilla.code).toContain("import { renderChart } from '@retikz/chart-vanilla';");
      expect(vanilla.code).toContain(
        "import { scatterChart, scatterChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';",
      );
      expect(vanilla.code).not.toContain('markDefinitions: [scatterMarkDefinition]');
      expect(vanilla.svg).toContain('<svg');
    }
  });

  it('将预览文本测量器传递到 Vanilla Chart 编译路径中', () => {
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

  it('通过 Vanilla 预览路径渲染选定的文档 Chart 主题', () => {
    const preview = buildPreviewIR(() => fertilityWorkZhPreviewSource.canonicalRender?.() ?? null);
    const vanilla = buildVanillaPreview(preview, {
      datasetImports: fertilityWorkZhPreviewSource.datasetImports,
      theme: { mode: 'light', name: 'academic' },
    });

    expect(vanilla.svg).toContain('<svg');
    expect(vanilla.code).toContain(
      "import { PreviewThemeDefinitionBundle } from '@/modules/docs/components/component-preview/theme';",
    );
    expect(vanilla.code).toContain("name: 'academic'");
    expect(vanilla.code).toContain('themeDefinitions: PreviewThemeDefinitionBundle.core');
    expect(vanilla.code).toContain('chartThemeDefinitions: PreviewThemeDefinitionBundle.chart');
    expect(vanilla.code).toContain('plotThemeDefinitions: PreviewThemeDefinitionBundle.plot');
  });
});
