import type { AnyCompositeDefinition, IRChild, LayoutProposal, ScenePrimitive } from '@retikz/core';

import { compileToScene, LayoutAxisProposalKind } from '@retikz/core';
import { beforeAll, describe, expect, it } from 'vitest';

import * as Standard from '../../src';
import {
  compileInHarness,
  compositeArtifact,
  createProbeLeaf,
  createProbeLeafDefinition,
  naturalProposal,
  pathPrimitivesOf,
  primitivesOf,
} from './test-utils';

type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;

type LayoutItemArtifact = Readonly<{
  marginBounds: Rect;
  slotBounds: Rect;
  allocationBounds: Rect;
  visualBounds: Rect;
  visibleBounds: Rect | null;
  translation: Readonly<{ x: number; y: number }>;
  overflow: Readonly<{
    allocation: Readonly<{ x: boolean; y: boolean }>;
    visual: Readonly<{ x: boolean; y: boolean }>;
    clipped: boolean;
  }>;
}>;

type LogicBlockArtifact = Readonly<{
  kind: 'logicBlockBase';
  id: string;
  outer: Readonly<{
    allocationBounds: Rect;
    shellVisualBounds: Rect | null;
    visualBounds: Rect;
    visibleBounds: Rect | null;
  }>;
  container: Readonly<{
    allocationBounds: Rect;
    contentBounds: Rect;
    visualBounds: Rect;
    visibleBounds: Rect | null;
  }>;
  header: LayoutItemArtifact | null;
  sections: ReadonlyArray<Readonly<{ key: string; role?: string; geometry: LayoutItemArtifact }>>;
  dividerVisualBounds: ReadonlyArray<Rect>;
}>;

const blockDefinitionOf = (): AnyCompositeDefinition => Standard.LogicBlockBaseDefinition;

const blockArtifactOf = (value: unknown): LogicBlockArtifact => {
  return Standard.LogicBlockBaseArtifactSchema.parse(value);
};

const child = (id: string, width = 24, height = 14): IRChild =>
  createProbeLeaf(id, {
    minimumWidth: width,
    minimumHeight: height,
    naturalWidth: width,
    naturalHeight: height,
  });

const sceneOf = (children: ReadonlyArray<IRChild>) => ({
  version: 1 as const,
  type: 'scene' as const,
  children: Array.from(children),
});

const compileRoot = (
  root: IRChild,
  records: Array<{ id: string; proposal: LayoutProposal }> = [],
  extraDefinitions: ReadonlyArray<AnyCompositeDefinition> = [],
) =>
  compileToScene(sceneOf([root]), {
    composites: [blockDefinitionOf(), createProbeLeafDefinition(records), ...extraDefinitions],
    padding: 0,
  });

const compileBlock = (
  block: IRChild,
  proposal: LayoutProposal = naturalProposal,
  records: Array<{ id: string; proposal: LayoutProposal }> = [],
) => {
  const result = compileInHarness(block, proposal, [blockDefinitionOf(), createProbeLeafDefinition(records)]);
  return { ...result, artifact: blockArtifactOf(compositeArtifact(result.output, 'logicBlockBase').value) };
};

const block = (input: Parameters<typeof Standard.createLogicBlockBase>[0]) => Standard.createLogicBlockBase(input);

const section = (
  key: string,
  id: string,
  options: Parameters<typeof child>[1] = 24,
): Standard.LogicBlockSectionInput => ({
  key,
  child: child(id, options),
});

const groupsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<Extract<ScenePrimitive, { type: 'group' }>> =>
  primitives.flatMap(primitive => (primitive.type === 'group' ? [primitive, ...groupsOf(primitive.children)] : []));

describe('LogicBlockBase layout and artifact contract', () => {
  beforeAll(() => {
    expect(Standard.LogicBlockBaseDefinition, 'production mutation required: LogicBlockBaseDefinition').toBeDefined();
    expect(
      Standard.LogicBlockBaseArtifactSchema,
      'production mutation required: LogicBlockBaseArtifactSchema',
    ).toBeDefined();
  });

  it('keeps header optional, preserves authored section order, and rejects empty or duplicate sections', () => {
    const headerOnly = block({ id: 'block-header-only', header: { child: child('header-only') }, sections: [] });
    const sectionsOnly = block({
      id: 'block-sections-only',
      sections: [section('first', 'section-first'), section('second', 'section-second')],
    });

    const headerArtifact = compileBlock(headerOnly).artifact;
    const sectionsArtifact = compileBlock(sectionsOnly).artifact;

    expect(headerArtifact.header).not.toBeNull();
    expect(headerArtifact.sections).toEqual([]);
    expect(sectionsArtifact.header).toBeNull();
    expect(sectionsArtifact.sections.map(item => item.key)).toEqual(['first', 'second']);
    expect(() =>
      Standard.LogicBlockBaseSchema.parse({ namespace: 'standard', type: 'logicBlockBase', id: 'empty' }),
    ).toThrow();
    expect(() =>
      Standard.LogicBlockBaseSchema.parse({
        namespace: 'standard',
        type: 'logicBlockBase',
        id: 'duplicate',
        sections: [section('same', 'same-a'), section('same', 'same-b')],
      }),
    ).toThrow(/Duplicate LogicBlockBase section key/);
  });

  it.each([
    [
      'content-natural',
      block({ id: 'block-natural', padding: 0, sections: [section('body', 'natural')] }),
      naturalProposal,
    ],
    [
      'fixed',
      block({
        id: 'block-fixed',
        padding: 0,
        size: { x: { kind: 'fixed', value: 72 }, y: { kind: 'fixed', value: 44 } },
        sections: [section('body', 'fixed')],
      }),
      naturalProposal,
    ],
    [
      'fill',
      block({
        id: 'block-fill',
        padding: 0,
        size: { x: { kind: 'fill' }, y: { kind: 'fill' } },
        sections: [section('body', 'fill')],
      }),
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 100 },
        y: { kind: LayoutAxisProposalKind.Exact, value: 70 },
      },
    ],
    [
      'range',
      block({ id: 'block-range', padding: 0, sections: [section('body', 'range')] }),
      {
        x: { kind: LayoutAxisProposalKind.Range, min: 40, max: 60 },
        y: { kind: LayoutAxisProposalKind.Range, min: 30, max: 50 },
      },
    ],
  ] as const)('resolves %s allocation through the public child proposal', (_name, value, proposal) => {
    const result = compileBlock(value, proposal);
    const allocation = result.artifact.outer.allocationBounds;

    if (value.id === 'block-natural') expect(allocation).toMatchObject({ width: 24, height: 14 });
    if (value.id === 'block-fixed') expect(allocation).toMatchObject({ width: 72, height: 44 });
    if (value.id === 'block-fill') expect(allocation).toMatchObject({ width: 100, height: 70 });
    if (value.id === 'block-range') expect(allocation).toMatchObject({ width: 40, height: 30 });
  });

  it('applies root padding as the region default and lets a region override it without double padding', () => {
    const defaultPadding = compileBlock(
      block({
        id: 'block-default-padding',
        padding: { x: 8, y: 4 },
        sections: [section('body', 'default-padding', 20)],
      }),
    ).artifact;
    const regionOverride = compileBlock(
      block({
        id: 'block-region-padding',
        padding: { x: 8, y: 4 },
        sections: [{ ...section('body', 'region-padding', 20), padding: { x: 2, y: 3 } }],
      }),
    ).artifact;

    expect(defaultPadding.outer.allocationBounds.width - regionOverride.outer.allocationBounds.width).toBe(12);
    expect(defaultPadding.outer.allocationBounds.height - regionOverride.outer.allocationBounds.height).toBe(2);
  });

  it('reserves rowGap plus divider stroke width and paints the divider on the gap centerline', () => {
    const noDivider = compileBlock(
      block({
        id: 'block-gap-only',
        padding: 0,
        rowGap: 6,
        appearance: { divider: false },
        sections: [section('first', 'gap-first', 10), section('second', 'gap-second', 10)],
      }),
    ).artifact;
    const withDividerResult = compileBlock(
      block({
        id: 'block-gap-divider',
        padding: 0,
        rowGap: 6,
        appearance: { divider: { strokeWidth: 2 } },
        sections: [section('first', 'divider-first', 10), section('second', 'divider-second', 10)],
      }),
    );
    const withDivider = withDividerResult.artifact;

    const noDividerGap =
      noDivider.sections[1].geometry.marginBounds.y -
      (noDivider.sections[0].geometry.marginBounds.y + noDivider.sections[0].geometry.marginBounds.height);
    const dividerGap =
      withDivider.sections[1].geometry.marginBounds.y -
      (withDivider.sections[0].geometry.marginBounds.y + withDivider.sections[0].geometry.marginBounds.height);
    expect(noDividerGap).toBe(6);
    expect(dividerGap).toBe(8);
    expect(withDivider.dividerVisualBounds).toHaveLength(1);
    const divider = withDivider.dividerVisualBounds[0];
    const centerline = divider.y + divider.height / 2;
    const expectedCenterline =
      withDivider.sections[0].geometry.marginBounds.y +
      withDivider.sections[0].geometry.marginBounds.height +
      6 / 2 +
      2 / 2;
    expect(centerline).toBeCloseTo(expectedCenterline, 6);
    expect(divider.height).toBeGreaterThanOrEqual(2);
    expect(divider.x).toBeLessThanOrEqual(withDivider.container.contentBounds.x);
    expect(divider.x + divider.width).toBeGreaterThanOrEqual(
      withDivider.container.contentBounds.x + withDivider.container.contentBounds.width,
    );

    const dividerPath = pathPrimitivesOf(withDividerResult.output.scene.primitives).find(
      path => path.strokeWidth === 2,
    );
    expect(dividerPath).toBeDefined();
    const commands = dividerPath?.commands;
    expect(commands?.[0]).toMatchObject({ kind: 'move', to: [withDivider.container.contentBounds.x, centerline] });
    expect(commands?.[1]).toMatchObject({
      kind: 'line',
      to: [withDivider.container.contentBounds.x + withDivider.container.contentBounds.width, centerline],
    });
  });

  it('does not reserve a divider when disabled or when its stroke width is zero, even if transparent', () => {
    const cases = [
      ['disabled', { divider: false }, 6],
      ['zero-width', { divider: { strokeWidth: 0 } }, 6],
      ['transparent', { divider: { strokeWidth: 2, opacity: 0 } }, 8],
    ] as const;
    cases.forEach(([name, appearance, expectedGap]) => {
      const artifact = compileBlock(
        block({
          id: `block-divider-${name}`,
          padding: 0,
          rowGap: 6,
          appearance,
          sections: [section('first', `first-${name}`, 10), section('second', `second-${name}`, 10)],
        }),
      ).artifact;
      const gap =
        artifact.sections[1].geometry.marginBounds.y -
        (artifact.sections[0].geometry.marginBounds.y + artifact.sections[0].geometry.marginBounds.height);
      expect(gap).toBe(expectedGap);
      expect(artifact.dividerVisualBounds.filter(rect => rect.width > 0 && rect.height > 0)).toEqual([]);
    });
  });

  it('stretches final region slots across the resolved content width without scaling child allocation', () => {
    const records: Array<{ id: string; proposal: LayoutProposal }> = [];
    const result = compileBlock(
      block({
        id: 'block-cross-stretch',
        padding: 0,
        size: { x: { kind: 'fixed', value: 80 }, y: { kind: 'content' } },
        sections: [
          {
            key: 'body',
            child: createProbeLeaf('stretch-child', {
              minimumWidth: 20,
              minimumHeight: 10,
              naturalWidth: 20,
              naturalHeight: 10,
              ignoreExact: true,
            }),
          },
        ],
      }),
      naturalProposal,
      records,
    );

    expect(
      records.some(
        record => record.id === 'stretch-child' && record.proposal.x.kind === 'exact' && record.proposal.x.value === 80,
      ),
    ).toBe(true);
    expect(result.artifact.sections[0].geometry.slotBounds.width).toBe(80);
    expect(result.artifact.sections[0].geometry.allocationBounds.width).toBe(20);
  });

  it('supports nested LogicBlockBase children through the same public definition registry', () => {
    const inner = block({ id: 'nested-inner', padding: 0, sections: [section('inner', 'nested-leaf', 12)] });
    const outer = block({ id: 'nested-outer', padding: 0, sections: [{ key: 'body', child: inner }] });
    const output = compileRoot(outer);
    const artifacts = output.artifacts
      .filter(value => value.kind === 'composite' && value.namespace === 'standard' && value.type === 'logicBlockBase')
      .map(value => blockArtifactOf(value.value));

    expect(artifacts.map(value => value.id)).toEqual(expect.arrayContaining(['nested-inner', 'nested-outer']));
    expect(groupsOf(output.scene.primitives).some(group => group.id === 'nested-leaf')).toBe(true);
  });

  it('applies appearance zIndex to the complete shell, content, and divider wrapper', () => {
    const high = block({
      id: 'block-z-index-high',
      padding: 0,
      appearance: { zIndex: 7, divider: { strokeWidth: 2 } },
      sections: [section('first', 'z-first', 10), section('second', 'z-second', 10)],
    });
    const low = block({
      id: 'block-z-index-low',
      padding: 0,
      appearance: { zIndex: 0, divider: false },
      sections: [section('body', 'z-low', 10)],
    });
    const output = compileToScene(sceneOf([high, low]), {
      composites: [blockDefinitionOf(), createProbeLeafDefinition()],
      padding: 0,
    });
    const rootGroups = output.scene.primitives.filter(
      (primitive): primitive is Extract<ScenePrimitive, { type: 'group' }> => primitive.type === 'group',
    );
    const shellIdOf = (group: Extract<ScenePrimitive, { type: 'group' }>): string | undefined => {
      const shell = primitivesOf([group]).find(primitive => primitive.type === 'rect');
      return shell?.type === 'rect' ? shell.id : undefined;
    };
    const wrapper = rootGroups.find(group => shellIdOf(group) === 'block-z-index-high');

    expect(rootGroups.map(shellIdOf)).toEqual(['block-z-index-low', 'block-z-index-high']);
    expect(wrapper).toBeDefined();
    expect(wrapper?.children.some(primitive => primitive.type === 'rect')).toBe(true);
    expect(wrapper?.children.some(primitive => primitive.type === 'group')).toBe(true);
    expect(wrapper?.children.some(primitive => primitive.type === 'path' && primitive.strokeWidth === 2)).toBe(true);
  });

  it('keeps visual overflow visible or clips it to the resolved block allocation', () => {
    const make = (overflow: 'visible' | 'clip', id: string) =>
      block({
        id,
        padding: 0,
        overflow,
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 30 } },
        sections: [
          {
            key: 'body',
            child: createProbeLeaf(`${id}-child`, {
              minimumWidth: 40,
              minimumHeight: 30,
              naturalWidth: 40,
              naturalHeight: 30,
              visualX: -20,
              visualY: -10,
              visualWidth: 90,
              visualHeight: 80,
            }),
          },
        ],
      });
    const visible = compileBlock(make('visible', 'block-overflow-visible')).artifact;
    const clipped = compileBlock(make('clip', 'block-overflow-clip')).artifact;

    expect(visible.container.visibleBounds!.width).toBeGreaterThan(visible.container.allocationBounds.width);
    expect(clipped.container.visibleBounds).toEqual(clipped.container.allocationBounds);
    expect(clipped.outer.visualBounds.width).toBeGreaterThan(clipped.outer.allocationBounds.width);
  });

  it('raises child probe failure instead of creating an empty region or placeholder', () => {
    const failing = block({
      id: 'block-failure',
      padding: 0,
      sections: [{ key: 'failure', child: createProbeLeaf('block-failed-child', { fail: true }) }],
    });

    expect(() => compileBlock(failing)).toThrow(/probe failure|failed|layout/i);
  });

  it('exposes strict header, section, container, outer, and divider artifact geometry', () => {
    const result = compileBlock(
      block({
        id: 'block-artifact',
        padding: 0,
        rowGap: 6,
        header: { child: child('artifact-header', 20, 8) },
        sections: [
          { ...section('input', 'artifact-input', 20), role: 'input' },
          { ...section('output', 'artifact-output', 20), role: 'output' },
        ],
        appearance: { divider: { strokeWidth: 2 } },
      }),
    );
    const artifact = result.artifact;
    const schema = Standard.LogicBlockBaseArtifactSchema;
    expect(artifact.kind).toBe('logicBlockBase');
    expect(artifact.id).toBe('block-artifact');
    expect(artifact.header).not.toBeNull();
    expect(artifact.sections.map(value => [value.key, value.role])).toEqual([
      ['input', 'input'],
      ['output', 'output'],
    ]);
    expect(Object.keys(artifact.container).sort()).toEqual([
      'allocationBounds',
      'contentBounds',
      'visibleBounds',
      'visualBounds',
    ]);
    expect(Object.keys(artifact.outer).sort()).toEqual([
      'allocationBounds',
      'shellVisualBounds',
      'visibleBounds',
      'visualBounds',
    ]);
    expect(artifact.dividerVisualBounds).toHaveLength(2);
    expect(artifact.header).not.toHaveProperty('key');
    expect(artifact.sections[0].geometry).not.toHaveProperty('sourceIndex');
    expect(schema.parse(JSON.parse(JSON.stringify(artifact)))).toEqual(artifact);
    expect(() => schema.parse({ ...artifact, extra: true })).toThrow();
  });
});
