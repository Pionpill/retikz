import type { FC } from 'react';
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
import { PreviewThemeProvider } from '../../src/modules/docs/components/component-preview/theme';
import { previewControlContract as extensionStatisticsZh } from '../../src/modules/docs/contents/viz/data/transform/extensions/extension-statistics.controls';
import { previewControlContract as extensionStatisticsEn } from '../../src/modules/docs/contents/viz/data/transform/extensions/extension-statistics.en.controls';
import ExtensionStatisticsDemo from '../../src/modules/docs/contents/viz/data/transform/extensions/extension-statistics.zh.demo';
import { previewControlContract as extensionTransformZh } from '../../src/modules/docs/contents/viz/data/transform/extensions/extension-transform.controls';
import { previewControlContract as extensionTransformEn } from '../../src/modules/docs/contents/viz/data/transform/extensions/extension-transform.en.controls';
import ExtensionTransformDemo from '../../src/modules/docs/contents/viz/data/transform/extensions/extension-transform.zh.demo';
import ExecutionDemo from '../../src/modules/docs/contents/viz/data/transform/operations/transform-execution';
import OverviewDemo from '../../src/modules/docs/contents/viz/data/transform/operations/transform-overview';
import PipelineDemo from '../../src/modules/docs/contents/viz/data/transform/operations/transform-pipeline-example';
import ReducerDemo from '../../src/modules/docs/contents/viz/data/transform/statistics/reducer-example';
import SelectorDemo from '../../src/modules/docs/contents/viz/data/transform/statistics/selector-example';
import StatisticsExecutionDemo from '../../src/modules/docs/contents/viz/data/transform/statistics/statistics-execution';
import StatisticsOverviewDemo from '../../src/modules/docs/contents/viz/data/transform/statistics/statistics-overview';

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
    for (const contract of [extensionTransformZh]) {
      const table = firstTableOf(contract);
      if (!('views' in table)) throw new Error(`Expected table views: ${table.id}`);

      expect(table.views?.map(view => view.label)).toEqual(['原始', '变换']);
    }
  });

  it('keeps distinct output views for custom transforms and statistics', () => {
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
  });

  it('keeps controlled previews within the responsive width budget', () => {
    const viewBoxWidthOf = (markup: string): number =>
      Number(markup.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) [\d.]+"/)?.[1]);
    const previews = [renderWithValues(ExtensionStatisticsDemo, {})];

    for (const preview of previews) expect(viewBoxWidthOf(preview)).toBeLessThanOrEqual(600);
  });

  it('makes custom transform parameters visibly effective', () => {
    expect(renderWithValues(ExtensionTransformDemo, { factor: 1 })).not.toBe(
      renderWithValues(ExtensionTransformDemo, { factor: 3 }),
    );
  });
});

describe('Data mechanism table comparisons', () => {
  it('renders computed summaries and selections in both languages', () => {
    for (const lang of ['zh', 'en'] as const) {
      for (const Demo of [PipelineDemo, ReducerDemo, SelectorDemo]) {
        const markup = renderToStaticMarkup(
          <PreviewThemeProvider>
            <Demo lang={lang} />
          </PreviewThemeProvider>,
        );
        expect(markup).toContain('data-retikz-id="before"');
        expect(markup).toContain('data-retikz-id="after"');
        expect(markup).toContain(lang === 'zh' ? '变换前' : 'Before');
        expect(markup).toContain(lang === 'zh' ? '变换后' : 'After');
      }
    }
    const summary = renderToStaticMarkup(
      <PreviewThemeProvider>
        <ReducerDemo />
      </PreviewThemeProvider>,
    );
    const selection = renderToStaticMarkup(
      <PreviewThemeProvider>
        <SelectorDemo />
      </PreviewThemeProvider>,
    );
    expect(summary).toContain('total');
    expect(summary).toContain('>60<');
    expect(selection).not.toContain('total');
    expect(selection.match(/>a2</g)).toHaveLength(2);
    expect(selection.match(/>a1</g)).toHaveLength(1);
  });
});

it('renders all mechanism flows with the registered vocabulary in both languages', () => {
  for (const Demo of [OverviewDemo, ExecutionDemo, StatisticsOverviewDemo, StatisticsExecutionDemo]) {
    for (const lang of ['zh', 'en'] as const) {
      expect(
        renderToStaticMarkup(
          <PreviewThemeProvider>
            <Demo lang={lang} />
          </PreviewThemeProvider>,
        ),
      ).toContain('<svg');
    }
  }
});
