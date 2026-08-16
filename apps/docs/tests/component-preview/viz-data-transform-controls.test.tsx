import type { FC } from 'react';

import { buildPlotIR, Plot } from '@retikz/plot-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type {
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewControlValues,
  PreviewTableControlField,
  PreviewTableRows,
} from '../../src/modules/docs/components/component-preview';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { previewControlContract as extensionStatisticsZh } from '../../src/modules/docs/contents/viz/data/transform/extensions/extension-statistics.controls';
import { previewControlContract as extensionStatisticsEn } from '../../src/modules/docs/contents/viz/data/transform/extensions/extension-statistics.en.controls';
import ExtensionStatisticsDemo from '../../src/modules/docs/contents/viz/data/transform/extensions/extension-statistics.zh.demo';
import { previewControlContract as extensionTransformZh } from '../../src/modules/docs/contents/viz/data/transform/extensions/extension-transform.controls';
import { previewControlContract as extensionTransformEn } from '../../src/modules/docs/contents/viz/data/transform/extensions/extension-transform.en.controls';
import ExtensionTransformDemo from '../../src/modules/docs/contents/viz/data/transform/extensions/extension-transform.zh.demo';
import { previewControlContract as annotateZh } from '../../src/modules/docs/contents/viz/data/transform/operations/transform-annotate.controls';
import { previewControlContract as annotateEn } from '../../src/modules/docs/contents/viz/data/transform/operations/transform-annotate.en.controls';
import AnnotateDemo from '../../src/modules/docs/contents/viz/data/transform/operations/transform-annotate.zh.demo';
import { previewControlContract as selectZh } from '../../src/modules/docs/contents/viz/data/transform/operations/transform-select.controls';
import { previewControlContract as selectEn } from '../../src/modules/docs/contents/viz/data/transform/operations/transform-select.en.controls';
import SelectDemo from '../../src/modules/docs/contents/viz/data/transform/operations/transform-select.zh.demo';
import { previewControlContract as sortZh } from '../../src/modules/docs/contents/viz/data/transform/operations/transform-sort.controls';
import { previewControlContract as sortEn } from '../../src/modules/docs/contents/viz/data/transform/operations/transform-sort.en.controls';
import SortDemo from '../../src/modules/docs/contents/viz/data/transform/operations/transform-sort.zh.demo';
import { renderTransformSortPreview } from '../../src/modules/docs/contents/viz/data/transform/operations/transform-sort-preview';
import { previewControlContract as summarizeZh } from '../../src/modules/docs/contents/viz/data/transform/operations/transform-summarize.controls';
import { previewControlContract as summarizeEn } from '../../src/modules/docs/contents/viz/data/transform/operations/transform-summarize.en.controls';
import SummarizeDemo from '../../src/modules/docs/contents/viz/data/transform/operations/transform-summarize.zh.demo';
import { renderTransformSummarizePreview } from '../../src/modules/docs/contents/viz/data/transform/operations/transform-summarize-preview';
import { previewControlContract as overviewZh } from '../../src/modules/docs/contents/viz/data/transform/overview/transform-component.controls';
import { previewControlContract as overviewEn } from '../../src/modules/docs/contents/viz/data/transform/overview/transform-component.en.controls';
import { renderTransformComponentPreview } from '../../src/modules/docs/contents/viz/data/transform/overview/transform-component-preview';
import { previewControlContract as boxplotZh } from '../../src/modules/docs/contents/viz/data/transform/statistics/transform-boxplot.controls';
import { previewControlContract as boxplotEn } from '../../src/modules/docs/contents/viz/data/transform/statistics/transform-boxplot.en.controls';
import BoxplotDemo from '../../src/modules/docs/contents/viz/data/transform/statistics/transform-boxplot.zh.demo';

const comparableContract = (contract: PreviewControlContract) => ({
  controls: JSON.parse(
    JSON.stringify(contract.controls, (key, value) =>
      ['title', 'label', 'help', 'customLabel'].includes(key) ? undefined : value,
    ),
  ) as PreviewControlsDefinition,
  canonicalValues: contract.canonicalValues,
  presets: contract.presets?.map(preset => ({ id: preset.id, values: preset.values })),
  relatedApis: contract.relatedApis,
});

const expectCompletePanelContract = (contract: PreviewControlContract): void => {
  expect(contract.controls.presentation).toBe('panel');
  if (contract.controls.presentation !== 'panel') return;
  expect(contract.controls.sections[0]?.controls[0]?.kind).toBe('table');
  const writableIds = getPreviewControlFields(contract.controls)
    .map(control => control.id)
    .sort();
  expect(Object.keys(contract.canonicalValues).sort()).toEqual(writableIds);
  for (const preset of contract.presets ?? []) expect(Object.keys(preset.values).sort()).toEqual(writableIds);
};

const firstTableOf = (contract: PreviewControlContract): PreviewTableControlField => {
  if (contract.controls.presentation !== 'panel') throw new Error('Expected panel controls');
  const field = contract.controls.sections
    .flatMap(section => section.controls)
    .find(control => control.kind === 'table');
  if (field?.kind !== 'table') throw new Error('Expected table control');
  return field;
};

const resolveTableView = (
  contract: PreviewControlContract,
  viewId: string,
  values: Readonly<PreviewControlValues>,
): PreviewTableRows => {
  const table = firstTableOf(contract);
  if (!('views' in table) || table.views === undefined) throw new Error(`Expected table views: ${table.id}`);
  const view = table.views.find(candidate => candidate.id === viewId);
  if (view === undefined) throw new Error(`Expected table view: ${viewId}`);
  return typeof view.rows === 'function' ? view.rows(values) : view.rows;
};

const renderWithValues = (Component: FC, values: Record<string, number | string>): string =>
  renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues: values,
        values,
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <Component />
    </PreviewControlStateContext.Provider>,
  );

describe('Viz Data transform controls', () => {
  const localizedPairs = [
    [overviewZh, overviewEn],
    [sortZh, sortEn],
    [summarizeZh, summarizeEn],
    [selectZh, selectEn],
    [annotateZh, annotateEn],
    [boxplotZh, boxplotEn],
    [extensionTransformZh, extensionTransformEn],
    [extensionStatisticsZh, extensionStatisticsEn],
  ] as const;

  it('keeps bilingual contracts structurally identical and complete', () => {
    for (const [zh, en] of localizedPairs) {
      expect(comparableContract(zh)).toEqual(comparableContract(en));
      expectCompletePanelContract(zh);
      expectCompletePanelContract(en);
    }
  });

  it('adds explicit source and transform-result views to every Viz Data transform table', () => {
    for (const [zh, en] of localizedPairs) {
      const zhTable = firstTableOf(zh);
      const enTable = firstTableOf(en);
      expect('views' in zhTable).toBe(true);
      expect('views' in enTable).toBe(true);
      if (!('views' in zhTable) || !('views' in enTable)) continue;
      expect(zhTable.views?.length).toBeGreaterThanOrEqual(2);
      expect(enTable.views?.length).toBeGreaterThanOrEqual(2);
      expect(zhTable.views?.map(view => view.id)).toEqual(enTable.views?.map(view => view.id));
      expect(zhTable.views?.[0]?.id).toBe('source');
    }
  });

  it('uses compact Chinese labels for source and single transform result views', () => {
    for (const contract of [overviewZh, sortZh, summarizeZh, selectZh, annotateZh, extensionTransformZh]) {
      const table = firstTableOf(contract);
      if (!('views' in table)) throw new Error(`Expected table views: ${table.id}`);
      expect(table.views?.map(view => view.label)).toEqual(['原始', '变换']);
    }
  });

  it('resolves exact rows for the four built-in transform operations', () => {
    expect(
      resolveTableView(sortZh, 'result', { field: 'month', order: 'descending' }).map(row => Reflect.get(row, 'month')),
    ).toEqual([6, 5, 4, 3, 2, 1]);
    expect(resolveTableView(summarizeZh, 'result', { reducerKind: 'sum' })).toEqual([
      { region: 'A', metric: 35 },
      { region: 'B', metric: 15 },
      { region: 'C', metric: 31 },
      { region: 'D', metric: 7 },
    ]);
    expect(resolveTableView(selectZh, 'result', { selectorKind: 'max', n: 1, tie: 'first' })).toEqual([
      { region: 'North', city: 'Brook', revenue: 49 },
      { region: 'South', city: 'Elm', revenue: 45 },
      { region: 'West', city: 'Harbor', revenue: 52 },
    ]);
    expect(
      resolveTableView(annotateZh, 'result', { reducerKind: 'mean' }).map(row => Reflect.get(row, 'benchmark')),
    ).toEqual([42.5, 42.5, 42.5, 42.5, 35, 35, 35, 35]);
  });

  it('keeps distinct output views for chained, mark-local, and custom transforms', () => {
    expect(resolveTableView(overviewZh, 'result', {})).toEqual([
      { region: 'B', total: 84 },
      { region: 'A', total: 77 },
      { region: 'C', total: 55 },
    ]);
    expect(
      resolveTableView(extensionTransformZh, 'result', { factor: 2 }).map(row => Reflect.get(row, 'scaledX')),
    ).toEqual([2, 4, 6, 8, 10]);
    expect(resolveTableView(extensionStatisticsZh, 'reducer-result', {})).toEqual([
      { group: 'A', midpoint: 76.5 },
      { group: 'B', midpoint: 72 },
      { group: 'C', midpoint: 82 },
    ]);
    expect(resolveTableView(extensionStatisticsZh, 'selector-result', {})).toEqual([
      { group: 'A', score: 74 },
      { group: 'B', score: 77 },
      { group: 'C', score: 81 },
    ]);
    expect(resolveTableView(boxplotZh, 'summary-result', { lowerP: 0.25, upperP: 0.75, factor: 1.5 })).not.toHaveLength(
      0,
    );
    expect(resolveTableView(boxplotZh, 'outlier-result', { lowerP: 0.25, upperP: 0.75, factor: 1.5 })).toEqual(
      expect.any(Array),
    );
  });

  it('uses large previews for data-table controls', () => {
    const pagePreviews = [
      ['transform/overview', 1],
      ['transform/operations', 4],
      ['transform/statistics', 1],
      ['transform/extensions', 2],
    ] as const;

    for (const [page, previewCount] of pagePreviews) {
      for (const locale of ['zh', 'en']) {
        const source = readFileSync(resolve(`src/modules/docs/contents/viz/data/${page}/index.${locale}.mdx`), 'utf8');
        expect(source.match(/size="lg"/g) ?? []).toHaveLength(previewCount);
        expect(source).not.toContain('size="md"');
        expect(source).not.toContain('size="sm"');
      }
    }
  });

  it('pins every transform bar preview to the value-axis baseline', () => {
    const plots = [
      {
        id: 'transform-component',
        fields: ['region', 'revenue', 'total'],
        plot: renderTransformComponentPreview(),
      },
      {
        id: 'transform-summarize',
        fields: ['region', 'revenue', 'metric'],
        plot: renderTransformSummarizePreview({ reducerKind: 'sum' }),
      },
    ];

    for (const { fields, id, plot } of plots) {
      const spec = buildPlotIR(plot.props.children, id, {
        dataFieldNames: new Set(fields),
      });

      expect(spec.scales, id).toContainEqual({
        type: 'linear',
        name: '__y',
        domainPadding: 0,
      });
    }
  });

  it('changes operation output for sort, summarize, select, and annotate', () => {
    expect(renderWithValues(SortDemo, { field: 'month', order: 'ascending' })).not.toBe(
      renderWithValues(SortDemo, { field: 'month', order: 'descending' }),
    );
    expect(renderWithValues(SortDemo, { field: 'revenue', order: 'ascending' })).not.toBe(
      renderWithValues(SortDemo, { field: 'revenue', order: 'descending' }),
    );
    expect(renderWithValues(SummarizeDemo, { reducerKind: 'sum' })).not.toBe(
      renderWithValues(SummarizeDemo, { reducerKind: 'count' }),
    );
    expect(renderWithValues(SelectDemo, { selectorKind: 'max', n: 1, tie: 'first' })).not.toBe(
      renderWithValues(SelectDemo, { selectorKind: 'top', n: 2, tie: 'all' }),
    );
    expect(renderWithValues(AnnotateDemo, { reducerKind: 'mean' })).not.toBe(
      renderWithValues(AnnotateDemo, { reducerKind: 'max' }),
    );
  });

  it('renders sort as one categorical bar plot', () => {
    const plot = renderTransformSortPreview({ field: 'month', order: 'ascending' });
    expect(plot.type).toBe(Plot);

    const spec = buildPlotIR(plot.props.children, 'transform-sort', {
      dataFieldNames: new Set(['month', 'revenue']),
    });

    expect(spec.transform).toContainEqual({ kind: 'sort', field: 'month', order: 'ascending' });
    expect(spec.scales).toContainEqual({ type: 'band', name: '__x', paddingInner: 0.2, paddingOuter: 0.12 });
    expect(spec.scales).toContainEqual({ type: 'linear', name: '__y', domainPadding: 0 });
  });

  it('keeps explicit cameras fixed for sort and boxplot extremes', () => {
    const sortA = renderWithValues(SortDemo, { field: 'month', order: 'ascending' });
    const sortB = renderWithValues(SortDemo, { field: 'revenue', order: 'descending' });
    const boxA = renderWithValues(BoxplotDemo, { lowerP: 0.25, upperP: 0.75, factor: 1.5 });
    const boxB = renderWithValues(BoxplotDemo, { lowerP: 0.05, upperP: 0.95, factor: 3 });
    expect(sortA.match(/viewBox="[^"]+"/)?.[0]).toBe(sortB.match(/viewBox="[^"]+"/)?.[0]);
    expect(boxA.match(/viewBox="[^"]+"/)?.[0]).toBe(boxB.match(/viewBox="[^"]+"/)?.[0]);
  });

  it('keeps controlled previews within the responsive width budget', () => {
    const viewBoxWidthOf = (markup: string): number =>
      Number(markup.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) [\d.]+"/)?.[1]);
    const previews = [
      renderWithValues(SortDemo, { field: 'month', order: 'ascending' }),
      renderWithValues(ExtensionStatisticsDemo, {}),
    ];

    for (const preview of previews) expect(viewBoxWidthOf(preview)).toBeLessThanOrEqual(600);
  });

  it('makes boxplot and custom transform parameters visibly effective', () => {
    expect(renderWithValues(BoxplotDemo, { lowerP: 0.25, upperP: 0.75, factor: 1.5 })).not.toBe(
      renderWithValues(BoxplotDemo, { lowerP: 0.1, upperP: 0.9, factor: 1 }),
    );
    expect(renderWithValues(ExtensionTransformDemo, { factor: 1 })).not.toBe(
      renderWithValues(ExtensionTransformDemo, { factor: 3 }),
    );
  });
});
