import { Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '../../src/modules/docs/components/component-preview';
import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import {
  getPreviewControlFields,
  resolveVisiblePreviewControlSections,
} from '../../src/modules/docs/components/component-preview/controls';
import { buildPreviewIR, irToVanillaCode } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import NamespaceConsumption from '../../src/modules/docs/contents/kernel/components/node/mechanism/namespace-consumption';
import NamespaceScope from '../../src/modules/docs/contents/kernel/components/node/mechanism/namespace-scope';
import NamespaceStorage from '../../src/modules/docs/contents/kernel/components/node/mechanism/namespace-storage';
import ListBasic from '../../src/modules/docs/contents/library/standard/collection/list/list-basic';
import ListComposition from '../../src/modules/docs/contents/library/standard/collection/list/list-composition';
import ListData from '../../src/modules/docs/contents/library/standard/collection/list/list-data';
import { previewSource as listDataPreviewSource } from '../../src/modules/docs/contents/library/standard/collection/list/list-data';
import ListLabels from '../../src/modules/docs/contents/library/standard/collection/list/list-labels';
import { createPreviewControlContract as createListLabelContract } from '../../src/modules/docs/contents/library/standard/collection/list/list-labels.controls';
import { previewSource as listSkeletonPreviewSource } from '../../src/modules/docs/contents/library/standard/collection/list/list-skeleton';
import { createPreviewControlContract as createListSkeletonContract } from '../../src/modules/docs/contents/library/standard/collection/list/list-skeleton.controls';
import { renderListSkeletonPreview } from '../../src/modules/docs/contents/library/standard/collection/list/list-skeleton.preview';
import { previewSource as listStylesPreviewSource } from '../../src/modules/docs/contents/library/standard/collection/list/list-styles';
import { createPreviewControlContract as createListStylesContract } from '../../src/modules/docs/contents/library/standard/collection/list/list-styles.controls';
import MapBasic from '../../src/modules/docs/contents/library/standard/collection/map/map-basic';
import MapComposition from '../../src/modules/docs/contents/library/standard/collection/map/map-composition';
import { previewSource as mapDataPreviewSource } from '../../src/modules/docs/contents/library/standard/collection/map/map-data';
import { previewSource as mapSkeletonPreviewSource } from '../../src/modules/docs/contents/library/standard/collection/map/map-skeleton';
import { createPreviewControlContract as createMapSkeletonContract } from '../../src/modules/docs/contents/library/standard/collection/map/map-skeleton.controls';
import { renderMapSkeletonPreview } from '../../src/modules/docs/contents/library/standard/collection/map/map-skeleton.preview';
import MapStyles from '../../src/modules/docs/contents/library/standard/collection/map/map-styles';

const ListSkeletonCanonical: FC = () => listSkeletonPreviewSource.canonicalRender?.() ?? null;
const MapSkeletonCanonical: FC = () => mapSkeletonPreviewSource.canonicalRender?.() ?? null;
const ListStylesCanonical: FC = () => listStylesPreviewSource.canonicalRender?.() ?? null;
const MapDataCanonical: FC = () => mapDataPreviewSource.canonicalRender?.() ?? null;
const ListDataCanonical: FC = () => listDataPreviewSource.canonicalRender?.() ?? null;

describe('List / Map documentation consumers', () => {
  it('offers fixed, shared auto and per-content List widths in both languages', () => {
    const chinese = createListStylesContract('zh');
    const english = createListStylesContract('en');
    const width = getPreviewControlFields(chinese.controls).find(field => field.id === 'widthMode');
    expect(width).toMatchObject({
      kind: 'select',
      defaultValue: 'fixed',
      options: [{ value: 'fixed' }, { value: 'auto' }, { value: 'content' }],
    });
    expect(chinese.canonicalValues).toEqual(english.canonicalValues);
    expect(getPreviewControlFields(english.controls).map(field => field.id)).toEqual(
      getPreviewControlFields(chinese.controls).map(field => field.id),
    );
  });
  it.each([
    ListSkeletonCanonical,
    MapSkeletonCanonical,
    ListDataCanonical,
    MapDataCanonical,
    ListBasic,
    ListStylesCanonical,
    ListComposition,
    MapBasic,
    MapStyles,
    MapComposition,
    NamespaceStorage,
    NamespaceConsumption,
    NamespaceScope,
  ])('generates executable Vanilla previews for %s', Component => {
    const preview = buildPreviewIR(Component);
    const output = buildVanillaPreview(preview);
    expect(output.code).not.toMatch(/Cannot generate|Failed to generate/);
    expect(output.svg).toContain('<svg');
    expect(output.code).toMatch(/(?:List|Map)InputEmbedAdapter/);
  });
  it('preserves authored cells in copied source and keeps the top-level structure', () => {
    const preview = buildPreviewIR(ListStylesCanonical);
    const code = irToVanillaCode(preview.sourceIr);
    expect(code).toContain("content: 'B1'");
    expect(code).toContain('items:');
    expect(code).toContain('ListInputEmbedAdapter');
    expect(code).not.toContain('__CELLS__');
    expect(code).not.toContain('__CELL_CONTENT__');
    expect(code).not.toContain('overlayLayout');
  });
});

it('keeps text cells compact in persistent IR and copied Vanilla code', () => {
  for (const Component of [ListBasic, MapBasic]) {
    const preview = buildPreviewIR(Component);
    const json = JSON.stringify(preview.sourceIr);
    const code = irToVanillaCode(preview.sourceIr);
    expect(json).not.toContain('"position"');
    expect(json).not.toContain('"type":"node"');
    expect(code).not.toContain('position:');
    expect(buildVanillaPreview(preview).svg).toContain('<svg');
  }
});

it('retains List content width in copied Vanilla source', () => {
  const code = irToVanillaCode({
    type: 'scene',
    version: 1,
    children: [{ namespace: 'standard', type: 'list', items: [{ content: 'A', layout: { width: 'content' } }] }],
  });
  expect(code).toContain("width: 'content'");
  expect(code).toContain('ListInputEmbedAdapter');
});

it('retains compact JSON data in copied code and runtime previews', () => {
  for (const Component of [ListDataCanonical, MapDataCanonical]) {
    const preview = buildPreviewIR(Component);
    const output = buildVanillaPreview(preview);
    expect(output.code).toContain('data:');
    expect(output.code).toContain("dataExpand: ['list']");
    expect(output.svg).toContain(Component === ListDataCanonical ? 'ready' : 'layout');
    expect(output.code).not.toContain('entries:');
    expect(output.code).not.toContain('items:');
    expect(output.svg).toContain('<svg');
  }
});

it('switches nested objects and arrays between text and components', () => {
  const renderMode = (dataExpand: 'all' | 'none' | 'map' | 'list'): string =>
    renderToStaticMarkup(
      <PreviewControlStateContext.Provider
        value={{
          canonicalValues: { dataExpand: 'list' },
          values: { dataExpand },
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        }}
      >
        <ListData />
      </PreviewControlStateContext.Provider>,
    );

  expect(renderMode('none')).toContain('[1,{&quot;active&quot;:true}]');
  expect(renderMode('map')).toContain('[1,{&quot;active&quot;:true}]');
  expect(renderMode('all')).not.toContain('[1,{&quot;active&quot;:true}]');
  expect(renderMode('list')).toContain('{&quot;ready&quot;:false}');
  expect(renderMode('map')).not.toContain('{&quot;ready&quot;:false}');
  expect(renderMode('map')).toContain('ready');
});

it('does not interpret JSON fields as drawable children or provider names', () => {
  const Component: FC = () => (
    <Layout>
      <Map
        data={{ namespace: 'foreign', type: 'custom', id: 'ordinary', content: { type: 'node', position: [0, 0] } }}
      />
    </Layout>
  );
  const preview = buildPreviewIR(Component);
  const output = buildVanillaPreview(preview);
  expect(output.code).toContain("namespace: 'foreign'");
  expect(output.code).not.toContain('foreignDefinition');
  expect(output.svg).toContain('<svg');
});

describe('List container label controls', () => {
  const contract = createListLabelContract('zh');

  const renderWithValues = (overrides: PreviewControlValues): string =>
    renderToStaticMarkup(
      <PreviewControlStateContext.Provider
        value={{
          canonicalValues: contract.canonicalValues,
          values: { ...contract.canonicalValues, ...overrides },
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        }}
      >
        <ListLabels />
      </PreviewControlStateContext.Provider>,
    );

  it('offers directional and boundary-fraction placement with matching Chinese and English control contracts', () => {
    const english = createListLabelContract('en');
    const fields = getPreviewControlFields(contract.controls);
    const englishFields = getPreviewControlFields(english.controls);

    expect(fields.map(field => field.id)).toEqual(englishFields.map(field => field.id));
    expect(contract.canonicalValues).toEqual(english.canonicalValues);
    expect(fields.find(field => field.id === 'positionMode')).toMatchObject({
      kind: 'select',
      defaultValue: 'direction',
      options: [{ value: 'direction' }, { value: 'boundary' }],
    });
    expect(fields.find(field => field.id === 'fraction')).toMatchObject({
      kind: 'range',
      min: 0,
      max: 1,
      visibleWhen: { controlId: 'positionMode', oneOf: ['boundary'] },
    });
    expect(fields.find(field => field.id === 'align')).toMatchObject({
      kind: 'select',
      options: [{ value: 'start' }, { value: 'middle' }, { value: 'end' }],
    });

    const visible = (positionMode: string) =>
      resolveVisiblePreviewControlSections(contract.controls.sections, {
        ...contract.canonicalValues,
        positionMode,
      }).flatMap(section => section.controls.map(control => control.id));
    expect(visible('direction')).not.toContain('fraction');
    expect(visible('boundary')).toContain('fraction');
  });

  it('moves the rendered label along the top boundary and aligns its visual box', () => {
    const left = renderWithValues({ positionMode: 'boundary', boundary: 'top', fraction: 0, align: 'start' });
    const right = renderWithValues({ positionMode: 'boundary', boundary: 'top', fraction: 1, align: 'start' });
    const centered = renderWithValues({ positionMode: 'boundary', boundary: 'top', fraction: 0, align: 'middle' });

    expect(left).toContain('values');
    expect(right).toContain('values');
    expect(left).not.toBe(right);
    expect(left).not.toBe(centered);
  });
});

it('骨架在源码与可执行 Vanilla 预览中保留唯一入口', () => {
  for (const Component of [ListSkeletonCanonical, MapSkeletonCanonical]) {
    const preview = buildPreviewIR(Component);
    const output = buildVanillaPreview(preview);
    expect(output.code).toContain('skeleton:');
    expect(output.code).not.toContain('items:');
    expect(output.code).not.toContain('entries:');
    expect(output.svg).toContain(Component === ListSkeletonCanonical ? 'x₁' : 'k₁');
  }
  const preview = buildPreviewIR(() => (
    <Layout>
      <Map entries={[{ key: {}, value: {} }]} />
    </Layout>
  ));
  expect(buildVanillaPreview(preview).code).not.toContain('__CELL_CONTENT__');
  expect(buildVanillaPreview(preview).svg).toContain('<svg');
});
it('骨架控件双语契约相同并覆盖空集合与最大数量', () => {
  for (const createContract of [createListSkeletonContract, createMapSkeletonContract]) {
    const zh = createContract('zh');
    const en = createContract('en');
    expect(zh.canonicalValues).toEqual(en.canonicalValues);
    expect(getPreviewControlFields(zh.controls).map(field => field.id)).toEqual(
      getPreviewControlFields(en.controls).map(field => field.id),
    );
  }
  for (const count of [0, 6]) {
    const output = buildVanillaPreview(
      buildPreviewIR(() => renderListSkeletonPreview({ mode: 'count', count, labels: '', index: 'auto' })),
    );
    expect(output.svg).toContain('<svg');
    expect(output.code).toContain(`count: ${count}`);
  }
  const empty = buildVanillaPreview(buildPreviewIR(() => renderMapSkeletonPreview({ keys: '', empty: true })));
  expect(empty.svg).toContain('<svg');
  expect(empty.code).toContain('keys: []');
});
