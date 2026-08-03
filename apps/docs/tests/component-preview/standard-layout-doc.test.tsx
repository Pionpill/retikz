import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';
import { createGrid, LegendContentKind } from '@retikz/standard';
import { FlexLayout, LayoutItem, Legend, LegendItem, LegendTitle } from '@retikz/standard-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { PreviewControlSection } from '../../src/modules/docs/components/component-preview';

import { resolvePreviewControlContract } from '../../src/modules/docs/components/component-preview/registry';
import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import ScopeInspectionEnDemo from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-layout-inspection.en.demo';
import { svg as scopeInspectionVanillaSvg } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-layout-inspection.vanilla';
import ScopeInspectionZhDemo from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-layout-inspection.zh.demo';
import FlexEnDemo from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-basic.en.demo';
import FlexZhDemo from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-basic.zh.demo';
import OverflowEnDemo from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-overflow.en.demo';
import OverflowZhDemo from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-overflow.zh.demo';
import { previewControlContract as flexZhContract } from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-playground.controls';
import { previewSource as flexPlaygroundSource } from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-playground.demo';
import { previewControlContract as flexEnContract } from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-playground.en.controls';
import GridEnDemo from '../../src/modules/docs/contents/standard/layout/grid-layout/grid-layout-basic.en.demo';
import GridZhDemo from '../../src/modules/docs/contents/standard/layout/grid-layout/grid-layout-basic.zh.demo';
import { previewControlContract as gridZhContract } from '../../src/modules/docs/contents/standard/layout/grid-layout/grid-layout-playground.controls';
import { previewSource as gridPlaygroundSource } from '../../src/modules/docs/contents/standard/layout/grid-layout/grid-layout-playground.demo';
import { previewControlContract as gridEnContract } from '../../src/modules/docs/contents/standard/layout/grid-layout/grid-layout-playground.en.controls';
import NestedEnDemo from '../../src/modules/docs/contents/standard/layout/layout-nested.en.demo';
import NestedZhDemo from '../../src/modules/docs/contents/standard/layout/layout-nested.zh.demo';
import OverlayEnDemo from '../../src/modules/docs/contents/standard/layout/overlay-layout/overlay-layout-basic.en.demo';
import OverlayZhDemo from '../../src/modules/docs/contents/standard/layout/overlay-layout/overlay-layout-basic.zh.demo';
import { previewControlContract as overlayZhContract } from '../../src/modules/docs/contents/standard/layout/overlay-layout/overlay-layout-playground.controls';
import { previewSource as overlayPlaygroundSource } from '../../src/modules/docs/contents/standard/layout/overlay-layout/overlay-layout-playground.demo';
import { previewControlContract as overlayEnContract } from '../../src/modules/docs/contents/standard/layout/overlay-layout/overlay-layout-playground.en.controls';

const FlexPlaygroundCanonical: FC = () => flexPlaygroundSource.canonicalRender?.() ?? null;
const GridPlaygroundCanonical: FC = () => gridPlaygroundSource.canonicalRender?.() ?? null;
const OverlayPlaygroundCanonical: FC = () => overlayPlaygroundSource.canonicalRender?.() ?? null;
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
              ir={createGrid({ bounds: { start: [0, 0], end: [20, 20] }, spacing: 10 })}
            />
          </FlexLayout>
        }
      >
        <Node position={[0, 0]} text="Nested" />
      </LegendItem>
    </Legend>
  </Layout>
);

const ScopedInspectionDemo: FC = () => (
  <Layout width={180} height={100}>
    <Scope inspect={{ layout: { bounds: { visual: true } } }}>
      <FlexLayout size={{ x: { kind: 'fixed', value: 140 }, y: { kind: 'fixed', value: 70 } }}>
        <LayoutItem kind="flex" itemKey="leaf">
          <Node position={[0, 0]} text="leaf" />
        </LayoutItem>
      </FlexLayout>
    </Scope>
  </Layout>
);

const MergedScopedInspectionDemo: FC = () => (
  <Layout width={180} height={100}>
    <Scope inspect={{ layout: { bounds: { visual: true }, overflow: false } }}>
      <FlexLayout
        inspect={{ bounds: { slot: false }, gaps: false }}
        size={{ x: { kind: 'fixed', value: 140 }, y: { kind: 'fixed', value: 70 } }}
      >
        <LayoutItem kind="flex" itemKey="leaf">
          <Node position={[0, 0]} text="leaf" />
        </LayoutItem>
      </FlexLayout>
    </Scope>
  </Layout>
);

const SoftDisabledScopedInspectionDemo: FC = () => (
  <Layout width={180} height={100} inspect={{ layout: true }}>
    <Scope inspect={{ layout: false }}>
      <FlexLayout size={{ x: { kind: 'fixed', value: 140 }, y: { kind: 'fixed', value: 70 } }}>
        <LayoutItem kind="flex" itemKey="leaf">
          <Node position={[0, 0]} text="leaf" />
        </LayoutItem>
      </FlexLayout>
    </Scope>
  </Layout>
);

const ReenabledNestedScopeInspectionDemo: FC = () => (
  <Layout width={320} height={100} inspect={{ layout: true }}>
    <Scope inspect={{ layout: false }}>
      <FlexLayout size={{ x: { kind: 'fixed', value: 120 }, y: { kind: 'fixed', value: 70 } }}>
        <LayoutItem kind="flex" itemKey="disabled">
          <Node position={[0, 0]} text="disabled" />
        </LayoutItem>
      </FlexLayout>
      <Scope inspect={{ layout: true }} transforms={[{ kind: 'translate', x: 160, y: 0 }]}>
        <FlexLayout size={{ x: { kind: 'fixed', value: 120 }, y: { kind: 'fixed', value: 70 } }}>
          <LayoutItem kind="flex" itemKey="enabled">
            <Node position={[0, 0]} text="enabled" />
          </LayoutItem>
        </FlexLayout>
      </Scope>
    </Scope>
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
  { name: 'nested zh', Component: NestedZhDemo },
  { name: 'nested en', Component: NestedEnDemo },
];

describe('Standard layout documentation demos', () => {
  it('loads transitive nested Standard definitions for a Legend Vanilla preview', () => {
    const preview = buildPreviewIR(LegendWithNestedStandardDemo);
    const vanilla = buildVanillaPreview(preview);

    expect(vanilla.code).toContain("legend('preview-legend-1'");
    expect(vanilla.code).toContain('const standardCompile = { composites: [FlexLayoutDefinition, GridDefinition] };');
    expect(vanilla.code).not.toContain('LegendDefinition');
    expect(vanilla.code).not.toContain('Unsupported Standard composite');
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
    expect(preview.ir.children[0]).toMatchObject({ namespace: 'standard' });
    expect(vanilla.code).not.toContain('Failed to generate Vanilla preview');
    expect(vanilla.code).not.toContain('Unsupported Standard composite');
    expect(vanilla.svg).toContain('<svg');
  });

  it.each([
    ['flexLayout', FlexPlaygroundCanonical, { lines: true, gaps: true, distributedSpace: false }],
    [
      'gridLayout',
      GridPlaygroundCanonical,
      { tracks: true, cells: false, gaps: true, distributedSpace: false, spans: false },
    ],
    ['overlayLayout', OverlayPlaygroundCanonical, { placements: false, anchors: false, stacking: false }],
  ])('keeps canonical %s component inspection in generated Vanilla output', (kind, Component, familyOptions) => {
    const preview = buildPreviewIR(Component);
    const vanilla = buildVanillaPreview(preview);

    expect(preview.inspectionRoots).toHaveLength(1);
    expect(preview.inspectionRoots[0].tree.policy?.component).toMatchObject({
      bounds: {
        container: false,
        content: true,
        slot: false,
        allocation: false,
        visual: false,
      },
      spacing: { padding: false, margin: false },
      overflow: false,
      alignmentGuides: false,
      labels: false,
      ...familyOptions,
    });
    expect(vanilla.code).toContain(`${kind}(`);
    expect(vanilla.svg).toContain('data-retikz-inspection="layout"');
  });

  it.each([
    ['zh', NestedZhDemo],
    ['en', NestedEnDemo],
  ])('keeps the nested %s demo root inspection in generated Vanilla output', (_language, Component) => {
    const preview = buildPreviewIR(Component);
    const vanilla = buildVanillaPreview(preview);

    expect(preview.inspect).toEqual({ layout: true });
    expect(vanilla.code).toContain('inspect: { layout: true }');
    expect(vanilla.svg).toContain('data-retikz-inspection="layout"');
  });

  it('keeps inherited Scope inspection in generated Vanilla output', () => {
    const preview = buildPreviewIR(ScopedInspectionDemo);
    const vanilla = buildVanillaPreview(preview);

    expect(vanilla.code).toContain('bounds: { visual: true }');
    expect(vanilla.svg).toContain('data-retikz-inspection="layout"');
  });

  it('merges inherited Scope fields with component-local inspection in generated Vanilla output', () => {
    const preview = buildPreviewIR(MergedScopedInspectionDemo);
    const vanilla = buildVanillaPreview(preview);

    expect(vanilla.code).toContain('visual: true');
    expect(vanilla.code).toContain('slot: false');
    expect(vanilla.code).toContain('overflow: false');
    expect(vanilla.code).toContain('gaps: false');
    expect(vanilla.svg).toContain('data-retikz-inspection="layout"');
  });

  it('keeps Scope layout false as a component-local Vanilla override', () => {
    const preview = buildPreviewIR(SoftDisabledScopedInspectionDemo);
    const vanilla = buildVanillaPreview(preview);

    expect(vanilla.code).toMatch(/flexLayout\('preview-flexLayout-1',[\s\S]*?\}, false\)/);
    expect(vanilla.svg).not.toContain('data-retikz-inspection="layout"');
  });

  it('lets a deeper Scope re-enable Vanilla inspection after layout false', () => {
    const preview = buildPreviewIR(ReenabledNestedScopeInspectionDemo);
    const vanilla = buildVanillaPreview(preview);

    expect(vanilla.code).toMatch(/flexLayout\('preview-flexLayout-1',[\s\S]*?\}, false\)/);
    expect(vanilla.code).toMatch(/flexLayout\('preview-flexLayout-2',[\s\S]*?\}, true\)/);
    expect(vanilla.svg).toContain('data-retikz-inspection="layout"');
  });

  it.each([
    ['zh', ScopeInspectionZhDemo],
    ['en', ScopeInspectionEnDemo],
  ])('keeps the real Scope inspection %s demo bilingual and preserves its hard barrier', (_language, Component) => {
    const preview = buildPreviewIR(Component);
    const vanilla = buildVanillaPreview(preview);

    expect(preview.inspect).toEqual({ layout: true });
    expect(preview.inspectionRoots).toEqual([
      {
        locator: {
          path: [
            { kind: 'sceneChild', index: 0 },
            { kind: 'scopeChild', index: 0 },
          ],
        },
        tree: {},
      },
      {
        locator: {
          path: [
            { kind: 'sceneChild', index: 1 },
            { kind: 'scopeChild', index: 0 },
          ],
        },
        tree: { policy: { inherited: { enabled: false } } },
      },
    ]);
    expect(vanilla.code).toContain("flexLayout('preview-flexLayout-2'");
    expect(vanilla.code).toContain('    }, false),');
    expect(vanilla.svg).toContain('data-retikz-inspection="layout"');
    expect(vanilla.svg?.match(/data-retikz-inspection="layout"/g)).toHaveLength(1);
    for (const label of ['A1', 'A2', 'B1', 'B2']) expect(vanilla.svg).toContain(label);
    for (const color of ['#dbeafe', '#2563eb', '#dcfce7', '#16a34a']) expect(vanilla.svg).toContain(color);
  });

  it('keeps the explicit Vanilla Scope demo equivalent to the React pair', () => {
    expect(scopeInspectionVanillaSource).toContain('inspect: { enabled: false }');
    expect(scopeInspectionVanillaSource).toContain('inspect: { layout: true }');
    expect(scopeInspectionVanillaSvg).toContain('<svg');
    expect(scopeInspectionVanillaSvg.match(/data-retikz-inspection="layout"/g)).toHaveLength(1);
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
