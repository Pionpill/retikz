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
import ArrayBasic from '../../src/modules/docs/contents/library/standard/collection/array/array-basic';
import ArrayComposition from '../../src/modules/docs/contents/library/standard/collection/array/array-composition';
import ArrayData from '../../src/modules/docs/contents/library/standard/collection/array/array-data';
import { previewSource as arrayDataPreviewSource } from '../../src/modules/docs/contents/library/standard/collection/array/array-data';
import ArrayLabels from '../../src/modules/docs/contents/library/standard/collection/array/array-labels';
import { createPreviewControlContract as createArrayLabelContract } from '../../src/modules/docs/contents/library/standard/collection/array/array-labels.controls';
import { previewSource as arraySkeletonPreviewSource } from '../../src/modules/docs/contents/library/standard/collection/array/array-skeleton';
import { createPreviewControlContract as createArraySkeletonContract } from '../../src/modules/docs/contents/library/standard/collection/array/array-skeleton.controls';
import { renderArraySkeletonPreview } from '../../src/modules/docs/contents/library/standard/collection/array/array-skeleton.preview';
import { previewSource as arrayStylesPreviewSource } from '../../src/modules/docs/contents/library/standard/collection/array/array-styles';
import { createPreviewControlContract as createArrayStylesContract } from '../../src/modules/docs/contents/library/standard/collection/array/array-styles.controls';
import MapBasic from '../../src/modules/docs/contents/library/standard/collection/map/map-basic';
import MapComposition from '../../src/modules/docs/contents/library/standard/collection/map/map-composition';
import { previewSource as mapDataPreviewSource } from '../../src/modules/docs/contents/library/standard/collection/map/map-data';
import { previewSource as mapSkeletonPreviewSource } from '../../src/modules/docs/contents/library/standard/collection/map/map-skeleton';
import { createPreviewControlContract as createMapSkeletonContract } from '../../src/modules/docs/contents/library/standard/collection/map/map-skeleton.controls';
import { renderMapSkeletonPreview } from '../../src/modules/docs/contents/library/standard/collection/map/map-skeleton.preview';
import MapStyles from '../../src/modules/docs/contents/library/standard/collection/map/map-styles';

const ArraySkeletonCanonical: FC = () => arraySkeletonPreviewSource.canonicalRender?.() ?? null;

const MapSkeletonCanonical: FC = () => mapSkeletonPreviewSource.canonicalRender?.() ?? null;

const ArrayStylesCanonical: FC = () => arrayStylesPreviewSource.canonicalRender?.() ?? null;

const MapDataCanonical: FC = () => mapDataPreviewSource.canonicalRender?.() ?? null;

const ArrayDataCanonical: FC = () => arrayDataPreviewSource.canonicalRender?.() ?? null;

describe('Array / Map documentation consumers', () => {
  it('offers fixed, shared auto and per-content Array widths in both languages', () => {
    const chinese = createArrayStylesContract('zh');
    const english = createArrayStylesContract('en');
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
    ArraySkeletonCanonical,
    MapSkeletonCanonical,
    ArrayDataCanonical,
    MapDataCanonical,
    ArrayBasic,
    ArrayStylesCanonical,
    ArrayComposition,
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
    expect(output.code).toMatch(/(?:Array|Map)InputEmbedAdapter/);
  });

  it('preserves authored cells in copied source and keeps the top-level structure', () => {
    const preview = buildPreviewIR(ArrayStylesCanonical);
    const code = irToVanillaCode(preview.sourceIr);

    expect(code).toContain("content: 'B1'");
    expect(code).toContain('items:');
    expect(code).toContain('ArrayInputEmbedAdapter');
    expect(code).not.toContain('__CELLS__');
    expect(code).not.toContain('__CELL_CONTENT__');
    expect(code).not.toContain('overlayLayout');
  });
});

it('keeps text cells compact in persistent IR and copied Vanilla code', () => {
  for (const Component of [ArrayBasic, MapBasic]) {
    const preview = buildPreviewIR(Component);
    const json = JSON.stringify(preview.sourceIr);
    const code = irToVanillaCode(preview.sourceIr);

    expect(json).not.toContain('"position"');
    expect(json).not.toContain('"type":"node"');
    expect(code).not.toContain('position:');
    expect(buildVanillaPreview(preview).svg).toContain('<svg');
  }
});

it('retains Array content width in copied Vanilla source', () => {
  const code = irToVanillaCode({
    type: 'scene',
    version: 1,
    children: [{ namespace: 'standard', type: 'array', items: [{ content: 'A', layout: { width: 'content' } }] }],
  });

  expect(code).toContain("width: 'content'");
  expect(code).toContain('ArrayInputEmbedAdapter');
});

it('retains compact JSON data in copied code and runtime previews', () => {
  for (const Component of [ArrayDataCanonical, MapDataCanonical]) {
    const preview = buildPreviewIR(Component);
    const output = buildVanillaPreview(preview);

    expect(output.code).toContain('data:');
    expect(output.code).toContain("dataExpand: ['array']");
    expect(output.svg).toContain(Component === ArrayDataCanonical ? 'ready' : 'layout');
    expect(output.code).not.toContain('entries:');
    expect(output.code).not.toContain('items:');
    expect(output.svg).toContain('<svg');
  }
});

it('switches nested objects and arrays between text and components', () => {
  const renderMode = (dataExpand: 'all' | 'none' | 'map' | 'array'): string =>
    renderToStaticMarkup(
      <PreviewControlStateContext.Provider
        value={{
          canonicalValues: { dataExpand: 'array' },
          values: { dataExpand },
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        }}
      >
        <ArrayData />
      </PreviewControlStateContext.Provider>,
    );

  expect(renderMode('none')).toContain('[1,{&quot;active&quot;:true}]');
  expect(renderMode('map')).toContain('[1,{&quot;active&quot;:true}]');
  expect(renderMode('all')).not.toContain('[1,{&quot;active&quot;:true}]');
  expect(renderMode('array')).toContain('{&quot;ready&quot;:false}');
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

describe('Array container label controls', () => {
  const contract = createArrayLabelContract('zh');

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
        <ArrayLabels />
      </PreviewControlStateContext.Provider>,
    );

  it('offers directional and boundary-fraction placement with matching Chinese and English control contracts', () => {
    const english = createArrayLabelContract('en');
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
  for (const Component of [ArraySkeletonCanonical, MapSkeletonCanonical]) {
    const preview = buildPreviewIR(Component);
    const output = buildVanillaPreview(preview);

    expect(output.code).toContain('skeleton:');
    expect(output.code).not.toContain('items:');
    expect(output.code).not.toContain('entries:');
    expect(output.svg).toContain(Component === ArraySkeletonCanonical ? 'x₁' : 'k₁');
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
  for (const createContract of [createArraySkeletonContract, createMapSkeletonContract]) {
    const zh = createContract('zh');
    const en = createContract('en');

    expect(zh.canonicalValues).toEqual(en.canonicalValues);
    expect(getPreviewControlFields(zh.controls).map(field => field.id)).toEqual(
      getPreviewControlFields(en.controls).map(field => field.id),
    );
  }

  for (const count of [0, 6]) {
    const output = buildVanillaPreview(
      buildPreviewIR(() => renderArraySkeletonPreview({ mode: 'count', count, labels: '', index: 'auto' })),
    );

    expect(output.svg).toContain('<svg');
    expect(output.code).toContain(`count: ${count}`);
  }

  const empty = buildVanillaPreview(buildPreviewIR(() => renderMapSkeletonPreview({ keys: '', empty: true })));

  expect(empty.svg).toContain('<svg');
  expect(empty.code).toContain('keys: []');
});
