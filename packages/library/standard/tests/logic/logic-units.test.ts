import type { AnyCompositeDefinition, CompileWarning, IRChild, ScenePrimitive } from '@retikz/core';

import { compileToScene, CompileWarningCode, LayoutAxisProposalKind } from '@retikz/core';
import { beforeAll, describe, expect, expectTypeOf, it } from 'vitest';

import type { DecisionArtifact, JunctionArtifact, StageArtifact, TerminalArtifact } from '../../src';

import {
  createDecision,
  createJunction,
  createStage,
  createTerminal,
  DecisionArtifactSchema,
  DecisionDefinition,
  DecisionSchema,
  JunctionArtifactSchema,
  JunctionDefinition,
  StageArtifactSchema,
  StageDefinition,
  StageSchema,
  TerminalArtifactSchema,
  TerminalDefinition,
} from '../../src';
import {
  compileInHarness,
  compositeArtifact,
  createProbeLeaf,
  createProbeLeafDefinition,
  exactProposal,
  naturalProposal,
  pathPrimitivesOf,
  primitivesOf,
} from './test-utils';

const child = (id: string): IRChild => ({
  type: 'node',
  id,
  position: [0, 0],
  text: 'content',
  font: { size: 10 },
  padding: 0,
  margin: 0,
});

const sceneOf = (children: ReadonlyArray<IRChild>) => ({
  version: 1 as const,
  type: 'scene' as const,
  children: Array.from(children),
});

const compileRoot = (
  root: IRChild,
  definitions: ReadonlyArray<AnyCompositeDefinition>,
  warnings: Array<CompileWarning> = [],
) =>
  compileToScene(sceneOf([root]), {
    composites: definitions,
    padding: 0,
    onWarn: warning => warnings.push(warning),
  });

const targetPath = (
  targetId: string,
  anchor: string | number | { side: 'top' | 'right' | 'bottom' | 'left'; fraction: number },
): IRChild => ({
  type: 'path',
  id: 'anchor-probe',
  stroke: 'currentColor',
  children: [
    { type: 'step', kind: 'move', to: [100, 0] },
    { type: 'step', kind: 'line', to: { id: targetId, anchor } },
  ],
});

const endpointOf = (primitives: ReadonlyArray<ScenePrimitive>): [number, number] => {
  const path = pathPrimitivesOf(primitives).find(primitive => primitive.id === 'anchor-probe');
  if (path === undefined) throw new Error('Expected Core target path primitive');
  const line = path.commands.find(command => command.kind === 'line');
  if (line === undefined || !Array.isArray(line.to)) throw new Error('Expected resolved Core line endpoint');
  return line.to;
};

describe('semantic logic unit Definitions', () => {
  beforeAll(() => {
    expect(TerminalDefinition, 'production mutation required: TerminalDefinition').toBeDefined();
    expect(StageDefinition, 'production mutation required: StageDefinition').toBeDefined();
    expect(DecisionDefinition, 'production mutation required: DecisionDefinition').toBeDefined();
    expect(JunctionDefinition, 'production mutation required: JunctionDefinition').toBeDefined();
    expect(TerminalArtifactSchema, 'production mutation required: TerminalArtifactSchema').toBeDefined();
    expect(StageArtifactSchema, 'production mutation required: StageArtifactSchema').toBeDefined();
    expect(DecisionArtifactSchema, 'production mutation required: DecisionArtifactSchema').toBeDefined();
    expect(JunctionArtifactSchema, 'production mutation required: JunctionArtifactSchema').toBeDefined();
  });

  it.each([
    {
      name: 'Terminal',
      type: 'terminal',
      definition: TerminalDefinition,
      value: createTerminal({ id: 'terminal-start', role: 'start' }),
      artifactSchema: TerminalArtifactSchema,
    },
    {
      name: 'Stage',
      type: 'stage',
      definition: StageDefinition,
      value: createStage({ id: 'stage-main', category: 'phase', content: child('stage-content') }),
      artifactSchema: StageArtifactSchema,
    },
    {
      name: 'Decision',
      type: 'decision',
      definition: DecisionDefinition,
      value: createDecision({ id: 'decision-main', content: child('decision-content') }),
      artifactSchema: DecisionArtifactSchema,
    },
    {
      name: 'Junction',
      type: 'junction',
      definition: JunctionDefinition,
      value: createJunction({ id: 'junction-main', role: 'fork' }),
      artifactSchema: JunctionArtifactSchema,
    },
  ] as const)(
    'directly injects the $name Definition and produces a typed artifact',
    ({ type, definition, value, artifactSchema }) => {
      const warnings: Array<CompileWarning> = [];
      const output = compileRoot(value, [definition], warnings);
      const artifact = compositeArtifact(output, type);

      expect(warnings).toEqual([]);
      expect(artifactSchema.parse(artifact.value)).toMatchObject({ kind: type, id: value.id });
    },
  );

  it.each([
    ['Terminal', TerminalDefinition, createTerminal({ id: 'terminal-missing', role: 'end' })],
    ['Stage', StageDefinition, createStage({ id: 'stage-missing', content: child('stage-missing-content') })],
    [
      'Decision',
      DecisionDefinition,
      createDecision({ id: 'decision-missing', content: child('decision-missing-content') }),
    ],
    ['Junction', JunctionDefinition, createJunction({ id: 'junction-missing' })],
  ] as const)('reports a Core diagnostic when the %s Definition is not registered', (_name, definition, value) => {
    const warnings: Array<CompileWarning> = [];
    compileRoot(value, [], warnings);

    expect(warnings.some(warning => warning.code === CompileWarningCode.CompositeNotRegistered)).toBe(true);
    expect(warnings.every(warning => warning.path.includes('children[0]'))).toBe(true);
    expect(definition).toBeDefined();
  });

  it('type-checks four public artifact types without collapsing their semantic fields', () => {
    expectTypeOf<TerminalArtifact['kind']>().toEqualTypeOf<'terminal'>();
    expectTypeOf<TerminalArtifact['role']>().toEqualTypeOf<'start' | 'end'>();
    expectTypeOf<StageArtifact['kind']>().toEqualTypeOf<'stage'>();
    expectTypeOf<StageArtifact['category']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<DecisionArtifact['kind']>().toEqualTypeOf<'decision'>();
    expectTypeOf<JunctionArtifact['kind']>().toEqualTypeOf<'junction'>();
    expectTypeOf<JunctionArtifact['role']>().toEqualTypeOf<string | undefined>();
  });

  it('keeps required content strict while no-content units still compile their default allocation', () => {
    expect(() => StageSchema.parse({ namespace: 'standard', type: 'stage', id: 'missing-content' })).toThrow();
    expect(() => DecisionSchema.parse({ namespace: 'standard', type: 'decision', id: 'missing-content' })).toThrow();

    const terminalOutput = compileRoot(createTerminal({ id: 'terminal-empty', role: 'start' }), [TerminalDefinition]);
    const junctionOutput = compileRoot(createJunction({ id: 'junction-empty' }), [JunctionDefinition]);
    const terminalArtifact = TerminalArtifactSchema.parse(compositeArtifact(terminalOutput, 'terminal').value);
    const junctionArtifact = JunctionArtifactSchema.parse(compositeArtifact(junctionOutput, 'junction').value);

    expect(terminalArtifact.content).toBeNull();
    expect(junctionArtifact.content).toBeNull();
    expect(terminalArtifact.outer.allocationBounds).toMatchObject({ width: 48, height: 24 });
    expect(junctionArtifact.outer.allocationBounds).toMatchObject({ width: 8, height: 8 });
    expect(terminalArtifact.container.contentBounds).toEqual({ x: 12, y: 6, width: 24, height: 12 });
    expect(junctionArtifact.container.contentBounds).toEqual({ x: 0, y: 0, width: 8, height: 8 });
    expect(primitivesOf(terminalOutput.scene.primitives).some(primitive => primitive.type === ('node' as string))).toBe(
      false,
    );
    expect(primitivesOf(junctionOutput.scene.primitives).some(primitive => primitive.type === ('node' as string))).toBe(
      false,
    );
  });

  it('probes minimum and natural contributions, then replays one final content proposal', () => {
    const records: Array<{ id: string; proposal: Parameters<typeof compileInHarness>[1] }> = [];
    const probeLeafDefinition = createProbeLeafDefinition(records);
    const stage = createStage({ id: 'stage-probe', content: createProbeLeaf('probe-child') });
    const { output, result } = compileInHarness(stage, exactProposal(80, 60), [StageDefinition, probeLeafDefinition]);

    expect(
      records.some(
        record => record.proposal.x.kind === LayoutAxisProposalKind.Intrinsic && record.proposal.x.mode === 'minimum',
      ),
    ).toBe(true);
    expect(
      records.some(
        record => record.proposal.x.kind === LayoutAxisProposalKind.Intrinsic && record.proposal.x.mode === 'natural',
      ),
    ).toBe(true);
    expect(
      records.some(record => record.proposal.x.kind === LayoutAxisProposalKind.Exact && record.proposal.x.value === 64),
    ).toBe(true);
    expect(
      records.some(record => record.proposal.y.kind === LayoutAxisProposalKind.Exact && record.proposal.y.value === 44),
    ).toBe(true);
    expect(result.slotSize).toEqual({ width: 80, height: 60 });
    expect(pathPrimitivesOf(output.scene.primitives).length).toBeGreaterThan(0);
  });

  it.each([
    [
      'content',
      createStage({ id: 'stage-content-size', content: createProbeLeaf('content-child') }),
      exactProposal(80, 60),
    ],
    [
      'fixed',
      createStage({
        id: 'stage-fixed-size',
        content: createProbeLeaf('fixed-child'),
        appearance: { size: { x: { kind: 'fixed', value: 80 }, y: { kind: 'fixed', value: 60 } } },
      }),
      naturalProposal,
    ],
    [
      'fill',
      createStage({
        id: 'stage-fill-size',
        content: createProbeLeaf('fill-child'),
        appearance: { size: { x: { kind: 'fill' }, y: { kind: 'fill' } } },
      }),
      exactProposal(100, 70),
    ],
  ] as const)('resolves %s size proposals with padding exactly once', (_name, stage, proposal) => {
    const records: Array<{ id: string; proposal: Parameters<typeof compileInHarness>[1] }> = [];
    const { result } = compileInHarness(stage, proposal, [StageDefinition, createProbeLeafDefinition(records)]);

    const final = records.at(-1);
    expect(final).toBeDefined();
    if (final === undefined) return;
    expect(final.proposal.x.kind).toBe(LayoutAxisProposalKind.Exact);
    expect(final.proposal.y.kind).toBe(LayoutAxisProposalKind.Exact);
    if (
      final.proposal.x.kind === LayoutAxisProposalKind.Exact &&
      final.proposal.y.kind === LayoutAxisProposalKind.Exact
    ) {
      expect(result.slotSize.width - final.proposal.x.value).toBe(16);
      expect(result.slotSize.height - final.proposal.y.value).toBe(16);
    }
  });

  it('keeps fixed and fill allocation stable when visual child bounds overflow', () => {
    const stage = createStage({
      id: 'stage-overflow',
      content: createProbeLeaf('overflow-child', { visualX: -30, visualY: -20, visualWidth: 100, visualHeight: 90 }),
      appearance: {
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 30 } },
        overflow: 'visible',
      },
    });
    const records: Array<{ id: string; proposal: Parameters<typeof compileInHarness>[1] }> = [];
    const { output } = compileInHarness(stage, naturalProposal, [StageDefinition, createProbeLeafDefinition(records)]);
    const artifact = StageArtifactSchema.parse(compositeArtifact(output, 'stage').value);

    expect(artifact.outer.allocationBounds).toMatchObject({ width: 40, height: 30 });
    expect(artifact.outer.visualBounds.width).toBeGreaterThan(artifact.outer.allocationBounds.width);
    expect(artifact.outer.visualBounds.height).toBeGreaterThan(artifact.outer.allocationBounds.height);
  });

  it('clips visible child bounds without changing fixed allocation', () => {
    const stage = createStage({
      id: 'stage-clip',
      content: createProbeLeaf('clip-child', { visualX: -30, visualY: -20, visualWidth: 100, visualHeight: 90 }),
      appearance: {
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 30 } },
        overflow: 'clip',
      },
    });
    const { output } = compileInHarness(stage, naturalProposal, [StageDefinition, createProbeLeafDefinition()]);
    const artifact = StageArtifactSchema.parse(compositeArtifact(output, 'stage').value);

    expect(artifact.outer.allocationBounds).toMatchObject({ width: 40, height: 30 });
    expect(artifact.outer.visualBounds.width).toBeGreaterThan(artifact.outer.allocationBounds.width);
    expect(artifact.container.visibleBounds).toEqual(artifact.container.allocationBounds);
    expect(artifact.outer.visibleBounds).toEqual(artifact.outer.shellVisualBounds);
  });

  it('fails loudly for a missing child Definition and a child probe failure', () => {
    const stageWithMissingChild = createStage({ id: 'stage-missing-child', content: createProbeLeaf('missing-child') });
    expect(() => compileInHarness(stageWithMissingChild, naturalProposal, [StageDefinition])).toThrow(
      /definition|probe|registered/i,
    );

    const stageWithFailedChild = createStage({
      id: 'stage-failed-child',
      content: createProbeLeaf('failed-child', { fail: true }),
    });
    expect(() =>
      compileInHarness(stageWithFailedChild, naturalProposal, [StageDefinition, createProbeLeafDefinition()]),
    ).toThrow(/probe failure/);
  });

  it('keeps semantic identity and target anchors stable across shape and boundary replacement', () => {
    const anchorCases = ['top-right', 45, { side: 'top' as const, fraction: 0.25 }] as const;
    anchorCases.forEach(anchor => {
      const baseline = createStage({ id: 'anchor-stage', category: 'phase', content: child('anchor-content') });
      const replacement = createStage({
        id: 'anchor-stage',
        category: 'phase',
        content: child('anchor-content'),
        appearance: { shape: 'circle', boundary: 'circle' },
      });
      const baselineOutput = compileToScene(sceneOf([baseline, targetPath('anchor-stage', anchor)]), {
        composites: [StageDefinition],
        padding: 0,
      });
      const replacementOutput = compileToScene(sceneOf([replacement, targetPath('anchor-stage', anchor)]), {
        composites: [StageDefinition],
        padding: 0,
      });
      const baselineArtifact = StageArtifactSchema.parse(compositeArtifact(baselineOutput, 'stage').value);
      const replacementArtifact = StageArtifactSchema.parse(compositeArtifact(replacementOutput, 'stage').value);

      expect(endpointOf(baselineOutput.scene.primitives)).not.toEqual(endpointOf(replacementOutput.scene.primitives));
      expect({ kind: baselineArtifact.kind, id: baselineArtifact.id, category: baselineArtifact.category }).toEqual({
        kind: replacementArtifact.kind,
        id: replacementArtifact.id,
        category: replacementArtifact.category,
      });
    });
  });

  it('does not introduce renderer-specific branches into the Core Scene', () => {
    const output = compileRoot(
      createDecision({ id: 'decision-scene-neutral', content: child('scene-neutral-content') }),
      [DecisionDefinition],
    );
    const serialized = JSON.stringify(output.scene);

    expect(serialized).not.toMatch(/renderer|svg|canvas/i);
  });

  it('applies semantic unit zIndex to the complete shell and content wrapper', () => {
    const high = createStage({
      id: 'z-index-stage-high',
      content: child('z-index-stage-high-content'),
      appearance: { zIndex: 6 },
    });
    const low = createStage({
      id: 'z-index-stage-low',
      content: child('z-index-stage-low-content'),
      appearance: { zIndex: 0 },
    });
    const output = compileToScene(sceneOf([high, low]), { composites: [StageDefinition], padding: 0 });
    const rootGroups = output.scene.primitives.filter(
      (primitive): primitive is Extract<ScenePrimitive, { type: 'group' }> => primitive.type === 'group',
    );
    const shellIdOf = (group: Extract<ScenePrimitive, { type: 'group' }>): string | undefined => {
      const shell = primitivesOf([group]).find(primitive => primitive.type === 'rect');
      return shell?.type === 'rect' ? shell.id : undefined;
    };
    const wrapper = rootGroups.find(group => shellIdOf(group) === 'z-index-stage-high');

    expect(rootGroups.map(shellIdOf)).toEqual(['z-index-stage-low', 'z-index-stage-high']);
    expect(wrapper).toBeDefined();
    expect(wrapper?.children.some(primitive => primitive.type === 'rect')).toBe(true);
    expect(wrapper?.children.some(primitive => primitive.type === 'group')).toBe(true);
  });

  it('retains schema round-trip for all four typed artifacts after real compilation', () => {
    const cases = [
      [
        TerminalArtifactSchema,
        createTerminal({ id: 'roundtrip-terminal', role: 'end' }),
        TerminalDefinition,
        'terminal',
      ],
      [
        StageArtifactSchema,
        createStage({ id: 'roundtrip-stage', content: child('roundtrip-stage-content') }),
        StageDefinition,
        'stage',
      ],
      [
        DecisionArtifactSchema,
        createDecision({ id: 'roundtrip-decision', content: child('roundtrip-decision-content') }),
        DecisionDefinition,
        'decision',
      ],
      [
        JunctionArtifactSchema,
        createJunction({ id: 'roundtrip-junction', role: 'merge' }),
        JunctionDefinition,
        'junction',
      ],
    ] as const;

    cases.forEach(([schema, value, definition, type]) => {
      const output = compileRoot(value, [definition]);
      const artifact = schema.parse(compositeArtifact(output, type).value);
      expect(schema.parse(JSON.parse(JSON.stringify(artifact)))).toEqual(artifact);
    });
  });

  it('uses explicit Core shape references and boundary providers without changing role/category semantics', () => {
    const terminal = createTerminal({
      id: 'shape-ref-terminal',
      role: 'start',
      appearance: { shape: { type: 'rectangle', params: { cornerRadius: 3 } }, boundary: 'circle' },
    });
    const junction = createJunction({
      id: 'shape-ref-junction',
      role: 'custom-join',
      appearance: { shape: { type: 'rectangle', params: { cornerRadius: 3 } }, boundary: 'circle' },
    });

    const terminalArtifact = TerminalArtifactSchema.parse(
      compositeArtifact(compileRoot(terminal, [TerminalDefinition]), 'terminal').value,
    );
    const junctionArtifact = JunctionArtifactSchema.parse(
      compositeArtifact(compileRoot(junction, [JunctionDefinition]), 'junction').value,
    );

    expect(terminalArtifact).toMatchObject({ kind: 'terminal', id: 'shape-ref-terminal', role: 'start' });
    expect(junctionArtifact).toMatchObject({ kind: 'junction', id: 'shape-ref-junction', role: 'custom-join' });
  });
});
