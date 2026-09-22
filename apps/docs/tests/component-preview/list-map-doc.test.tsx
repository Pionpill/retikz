import { Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/container';
import type { FC } from 'react';
import { describe, expect, it } from 'vitest';

import { buildPreviewIR, irToVanillaCode } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import NamespaceConsumption from '../../src/modules/docs/contents/kernel/components/node/mechanism/namespace-consumption';
import NamespaceScope from '../../src/modules/docs/contents/kernel/components/node/mechanism/namespace-scope';
import NamespaceStorage from '../../src/modules/docs/contents/kernel/components/node/mechanism/namespace-storage';
import ListBasic from '../../src/modules/docs/contents/library/standard/container/list/list-basic';
import ListComposition from '../../src/modules/docs/contents/library/standard/container/list/list-composition';
import ListData from '../../src/modules/docs/contents/library/standard/container/list/list-data';
import ListStyles from '../../src/modules/docs/contents/library/standard/container/list/list-styles';
import MapBasic from '../../src/modules/docs/contents/library/standard/container/map/map-basic';
import MapComposition from '../../src/modules/docs/contents/library/standard/container/map/map-composition';
import MapData from '../../src/modules/docs/contents/library/standard/container/map/map-data';
import MapStyles from '../../src/modules/docs/contents/library/standard/container/map/map-styles';

describe('List / Map documentation consumers', () => {
  it.each([
    ListData,
    MapData,
    ListBasic,
    ListStyles,
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
  it('preserves authored cell ids in copied source and keeps the top-level structure', () => {
    const preview = buildPreviewIR(ListStyles);
    const code = irToVanillaCode(preview.sourceIr);
    expect(code).toContain("id: 'selected'");
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

it('retains compact JSON data in copied code and runtime previews', () => {
  for (const Component of [ListData, MapData]) {
    const preview = buildPreviewIR(Component);
    const output = buildVanillaPreview(preview);
    expect(output.code).toContain('data:');
    expect(output.code).toContain('label:');
    expect(output.svg).toContain(Component === ListData ? 'values' : 'record');
    expect(output.code).not.toContain('entries:');
    expect(output.code).not.toContain('items:');
    expect(output.svg).toContain('<svg');
  }
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
