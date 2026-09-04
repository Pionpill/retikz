import type { FC } from 'react';

import { FlexLayout, LayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import { createGrid, LegendContentKind } from '@retikz/standard';
import { Legend, LegendItem, LegendTitle } from '@retikz/standard-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlSection } from '../../src/modules/docs/components/component-preview';

import { resolvePreviewControlContract } from '../../src/modules/docs/components/component-preview/registry';
import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import ScopeInspectionEnDemo, {
  previewSource as scopeInspectionEnSource,
} from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-layout-inspection.en.demo';
import { svg as scopeInspectionVanillaSvg } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-layout-inspection.vanilla';
import ScopeInspectionZhDemo, {
  previewSource as scopeInspectionZhSource,
} from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-layout-inspection.zh.demo';
import FlexEnDemo from '../../src/modules/docs/contents/library/layout/flex-layout/flex-layout-basic.en.demo';
import FlexZhDemo from '../../src/modules/docs/contents/library/layout/flex-layout/flex-layout-basic.zh.demo';
import OverflowEnDemo from '../../src/modules/docs/contents/library/layout/flex-layout/flex-layout-overflow.en.demo';
import OverflowZhDemo from '../../src/modules/docs/contents/library/layout/flex-layout/flex-layout-overflow.zh.demo';
import { previewControlContract as flexZhContract } from '../../src/modules/docs/contents/library/layout/flex-layout/flex-layout-playground.controls';
import { previewSource as flexPlaygroundSource } from '../../src/modules/docs/contents/library/layout/flex-layout/flex-layout-playground.demo';
import { previewControlContract as flexEnContract } from '../../src/modules/docs/contents/library/layout/flex-layout/flex-layout-playground.en.controls';
import GridEnDemo from '../../src/modules/docs/contents/library/layout/grid-layout/grid-layout-basic.en.demo';
import GridZhDemo from '../../src/modules/docs/contents/library/layout/grid-layout/grid-layout-basic.zh.demo';
import { previewControlContract as gridZhContract } from '../../src/modules/docs/contents/library/layout/grid-layout/grid-layout-playground.controls';
import { previewSource as gridPlaygroundSource } from '../../src/modules/docs/contents/library/layout/grid-layout/grid-layout-playground.demo';
import { previewControlContract as gridEnContract } from '../../src/modules/docs/contents/library/layout/grid-layout/grid-layout-playground.en.controls';
import { previewSource as nestedEnSource } from '../../src/modules/docs/contents/library/layout/layout-nested.en.demo';
import { previewSource as nestedZhSource } from '../../src/modules/docs/contents/library/layout/layout-nested.zh.demo';
import OverlayEnDemo from '../../src/modules/docs/contents/library/layout/overlay-layout/overlay-layout-basic.en.demo';
import OverlayZhDemo from '../../src/modules/docs/contents/library/layout/overlay-layout/overlay-layout-basic.zh.demo';
import { previewControlContract as overlayZhContract } from '../../src/modules/docs/contents/library/layout/overlay-layout/overlay-layout-playground.controls';
import { previewSource as overlayPlaygroundSource } from '../../src/modules/docs/contents/library/layout/overlay-layout/overlay-layout-playground.demo';
import { previewControlContract as overlayEnContract } from '../../src/modules/docs/contents/library/layout/overlay-layout/overlay-layout-playground.en.controls';

const FlexPlaygroundCanonical: FC = () => flexPlaygroundSource.canonicalRender!();
const GridPlaygroundCanonical: FC = () => gridPlaygroundSource.canonicalRender!();
const OverlayPlaygroundCanonical: FC = () => overlayPlaygroundSource.canonicalRender!();
const NestedEnCanonical: FC = () => nestedEnSource.canonicalRender();
const NestedZhCanonical: FC = () => nestedZhSource.canonicalRender();
const ScopeInspectionEnCanonical: FC = () => scopeInspectionEnSource.canonicalRender();
const ScopeInspectionZhCanonical: FC = () => scopeInspectionZhSource.canonicalRender();
const scopeInspectionVanillaSource = readFileSync(
  resolve('src/modules/docs/contents/kernel/components/layout/scope/scope-layout-inspection.vanilla.ts'),
  'utf8',
);

const LegendWithNestedStandardDemo: FC = () => (
  <Layout width={220} height={140}>
    <Legend kind={LegendContentKind.Items}>
      <LegendTitle>
        <Node position={[0, 0]} text="Legend" />
      </LegendTitle>
      <LegendItem
        itemKey="nested-grid"
        sample={
          <FlexLayout>
            <LayoutItem
              kind="flex"
              itemKey="grid"
              ir={createGrid({ bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } })}
            />
          </FlexLayout>
        }
      >
        <Node position={[0, 0]} text="Nested" />
      </LegendItem>
    </Legend>
  </Layout>
);

const demos: ReadonlyArray<Readonly<{ name: string; Component: FC }>> = [
  { name: 'flex zh', Component: FlexZhDemo },
  { name: 'flex en', Component: FlexEnDemo },
  { name: 'flex overflow zh', Component: OverflowZhDemo },
  { name: 'flex overflow en', Component: OverflowEnDemo },
  { name: 'flex controls', Component: FlexPlaygroundCanonical },
  { name: 'grid zh', Component: GridZhDemo },
  { name: 'grid en', Component: GridEnDemo },
  { name: 'grid controls', Component: GridPlaygroundCanonical },
  { name: 'overlay zh', Component: OverlayZhDemo },
  { name: 'overlay en', Component: OverlayEnDemo },
  { name: 'overlay controls', Component: OverlayPlaygroundCanonical },
  { name: 'nested zh', Component: NestedZhCanonical },
  { name: 'nested en', Component: NestedEnCanonical },
];

describe('Layout documentation demos', () => {
  it('loads transitive nested Standard definitions for a Legend Vanilla preview', () => {
    const preview = buildPreviewIR(LegendWithNestedStandardDemo);
    const vanilla = buildVanillaPreview(preview);

    expect(vanilla.code).toContain("legend('preview-legend-1'");
    expect(vanilla.code).toContain('const compile = { composites: [GridDefinition, FlexLayoutDefinition] };');
    expect(vanilla.code).not.toContain('LegendDefinition');
    expect(vanilla.code).not.toContain('Unsupported Layout composite');
    expect(vanilla.svg).toContain('<svg');
    expect(vanilla.svg).toContain('Nested');
  });
  it.each([
    ['flex', flexZhContract, flexEnContract],
    ['grid', gridZhContract, gridEnContract],
    ['overlay', overlayZhContract, overlayEnContract],
  ])('keeps %s controls structurally aligned across languages', (_name, chinese, english) => {
    expect(english.stateOnlyIds).toEqual(chinese.stateOnlyIds);
    expect(english.canonicalValues).toEqual(chinese.canonicalValues);
    expect(
      english.presets.map(preset => ({ id: preset.id, values: preset.values, applyMode: preset.applyMode })),
    ).toEqual(chinese.presets.map(preset => ({ id: preset.id, values: preset.values, applyMode: preset.applyMode })));
    expect(english.relatedApis).toEqual(chinese.relatedApis);
    expect(english.controls.sections.map(section => section.controls.map(control => control.id))).toEqual(
      chinese.controls.sections.map(section => section.controls.map(control => control.id)),
    );
  });

  it.each([
    ['flex', flexEnContract, 'Inspection details', 'Inspection preset'],
    ['grid', gridEnContract, 'Inspection details', 'Inspection preset'],
    ['overlay', overlayEnContract, 'Overlay details', 'Overlay preset'],
  ])('uses family-accurate English inspection labels for %s', (_name, contract, detailsLabel, presetLabel) => {
    expect(contract.controls.sections[0].label).toBe(detailsLabel);
    expect(contract.presetSelector.label).toBe(presetLabel);
  });

  it.each([
    ['flex zh', flexZhContract],
    ['flex en', flexEnContract],
    ['grid zh', gridZhContract],
    ['grid en', gridEnContract],
    ['overlay zh', overlayZhContract],
    ['overlay en', overlayEnContract],
  ])('resolves preset-only inspection state for %s', (_name, contract) => {
    expect(resolvePreviewControlContract({ previewControlContract: contract })).toBe(contract);
  });

  it.each([
    [
      'flex',
      flexZhContract,
      {
        inspectLines: true,
        inspectGaps: true,
        inspectDistributedSpace: false,
      },
    ],
    [
      'grid',
      gridZhContract,
      {
        inspectTracks: true,
        inspectCells: false,
        inspectGaps: true,
        inspectDistributedSpace: false,
        inspectSpans: false,
      },
    ],
    [
      'overlay',
      overlayZhContract,
      {
        inspectPlacements: false,
        inspectAnchors: false,
        inspectStacking: false,
      },
    ],
  ])('offers reusable recommended, all, and off inspection profiles for %s', (_name, contract, familyValues) => {
    const recommendedValues = {
      ...contract.canonicalValues,
      inspect: true,
      inspectContainer: false,
      inspectContent: true,
      inspectPadding: false,
      inspectSlot: false,
      inspectMargin: false,
      inspectAllocation: false,
      inspectVisual: false,
      inspectOverflow: false,
      inspectAlignmentGuides: false,
      inspectLabels: false,
      ...familyValues,
    };
    const detailIds = Object.keys(recommendedValues).filter(id => id.startsWith('inspect') && id !== 'inspect');
    const inspectionDetailSection: PreviewControlSection = contract.controls.sections[0];
    const controlIds = contract.controls.sections.flatMap(section => section.controls.map(control => control.id));

    expect(inspectionDetailSection.defaultCollapsed).toBe(true);
    expect(inspectionDetailSection.visibleWhen).toBeUndefined();
    expect(inspectionDetailSection.controls.map(control => control.id)).toEqual(detailIds);
    expect(controlIds).not.toContain('inspect');
    expect(contract.stateOnlyIds).toEqual(['inspect']);
    expect(contract.canonicalValues).toEqual(recommendedValues);
    expect(contract.presets.map(preset => preset.id)).toEqual(['recommended', 'all', 'off']);
    expect(contract.presets[0]?.values).toEqual(recommendedValues);
    expect(contract.presets[1]?.values).toEqual({
      ...recommendedValues,
      ...Object.fromEntries(detailIds.map(id => [id, true])),
    });
    expect(contract.presets[2]).toMatchObject({
      values: { inspect: false },
      applyMode: 'merge-current',
    });
  });

  it.each(demos)('derives canonical IR and a real Vanilla SVG for $name', ({ Component }) => {
    const preview = buildPreviewIR(Component);
    const vanilla = buildVanillaPreview(preview);

    expect(preview.ir.children).toHaveLength(1);
    expect(preview.ir.children[0]).toMatchObject({ namespace: 'layout' });
    expect(vanilla.code).not.toContain('Failed to generate Vanilla preview');
    expect(vanilla.code).not.toContain('Unsupported Layout composite');
    expect(vanilla.svg).toContain('<svg');
  });

  it.each([
    ['flex zh', FlexZhDemo],
    ['flex en', FlexEnDemo],
    ['grid zh', GridZhDemo],
    ['grid en', GridEnDemo],
    ['overlay zh', OverlayZhDemo],
    ['overlay en', OverlayEnDemo],
  ] as const)('keeps %s basic Source IR free of optional item keys', (_name, Component) => {
    const source = JSON.stringify(buildPreviewIR(Component).sourceIr);

    expect(source).not.toContain('"key":');
  });

  it.each([
    ['flexLayout', FlexPlaygroundCanonical],
    ['gridLayout', GridPlaygroundCanonical],
    ['overlayLayout', OverlayPlaygroundCanonical],
  ])('keeps runtime-only %s inspection out of canonical IR and Vanilla output', (kind, Component) => {
    const preview = buildPreviewIR(Component);
    const vanilla = buildVanillaPreview(preview);

    expect(preview).not.toHaveProperty('inspectionRoots');
    expect(preview).not.toHaveProperty('inspect');
    expect(vanilla.code).toContain(`${kind}(`);
    expect(vanilla.code).not.toMatch(/\binspect\b/);
    expect(vanilla.svg).not.toContain('data-retikz-readonly-layer');
  });

  it.each([
    ['zh', NestedZhCanonical],
    ['en', NestedEnCanonical],
  ])('keeps nested %s demo selection out of generated Vanilla output', (_language, Component) => {
    const preview = buildPreviewIR(Component);
    const vanilla = buildVanillaPreview(preview);

    expect(preview).not.toHaveProperty('inspect');
    expect(vanilla.code).not.toMatch(/\binspect\b/);
    expect(vanilla.svg).not.toContain('data-retikz-readonly-layer');
  });

  it.each([
    ['zh', ScopeInspectionZhDemo, ScopeInspectionZhCanonical],
    ['en', ScopeInspectionEnDemo, ScopeInspectionEnCanonical],
  ])(
    'renders the optional Scope inspection %s demo while keeping preview IR pure',
    (_language, Component, Canonical) => {
      const preview = buildPreviewIR(Canonical);
      const vanilla = buildVanillaPreview(preview);
      const html = renderToString(<Component />);

      expect(preview).not.toHaveProperty('inspectionRoots');
      expect(preview).not.toHaveProperty('inspect');
      expect(vanilla.code).toContain("flexLayout('preview-flexLayout-2'");
      expect(vanilla.code).not.toMatch(/\binspect\b/);
      expect(vanilla.svg).not.toContain('data-retikz-readonly-layer');
      expect(html).toContain('data-retikz-readonly-layer');
      for (const label of ['A1', 'A2', 'B1', 'B2']) expect(vanilla.svg).toContain(label);
      for (const color of ['#dbeafe', '#2563eb', '#dcfce7', '#16a34a']) expect(vanilla.svg).toContain(color);
    },
  );

  it('keeps the explicit Vanilla Scope demo equivalent to the React pair', () => {
    expect(scopeInspectionVanillaSource).toContain('createLayoutInspectionBarrier()');
    expect(scopeInspectionVanillaSource).toContain('createLayoutInspectionVanillaDriver()');
    expect(scopeInspectionVanillaSvg).toContain('<svg');
    expect(scopeInspectionVanillaSvg).toContain('data-retikz-readonly-layer');
    for (const label of ['A1', 'A2', 'B1', 'B2']) {
      expect(scopeInspectionVanillaSource).toContain(label);
      expect(scopeInspectionVanillaSvg).toContain(label);
    }
    for (const color of ['#dbeafe', '#2563eb', '#dcfce7', '#16a34a']) {
      expect(scopeInspectionVanillaSource).toContain(color);
      expect(scopeInspectionVanillaSvg).toContain(color);
    }
  });
});
