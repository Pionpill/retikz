import type { AnyCompositeDefinition, IRChild } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { beforeAll, describe, expect, expectTypeOf, it } from 'vitest';

import type {
  DecisionArtifact,
  JunctionArtifact,
  LogicLayoutItemArtifact,
  StageArtifact,
  TerminalArtifact,
} from '../../src';

import * as Standard from '../../src';
import {
  createDecision,
  createJunction,
  createStage,
  createTerminal,
  DecisionArtifactSchema,
  DecisionDefinition,
  JunctionArtifactSchema,
  JunctionDefinition,
  StageArtifactSchema,
  StageDefinition,
  TerminalArtifactSchema,
  TerminalDefinition,
} from '../../src';
import { compositeArtifact, createProbeLeaf, createProbeLeafDefinition, naturalProposal } from './test-utils';

type CalloutProductionSurface = typeof Standard & {
  CalloutDefinition?: AnyCompositeDefinition;
  CalloutArtifactSchema?: Readonly<{ parse: (value: unknown) => unknown }>;
};

const calloutProduction = Standard as CalloutProductionSurface;

type CalloutArtifact = Readonly<Record<string, unknown>>;

const calloutDefinitionOf = (): AnyCompositeDefinition => {
  return Standard.CalloutDefinition;
};

const calloutArtifactSchemaOf = (): Readonly<{ parse: (value: unknown) => unknown }> => {
  return Standard.CalloutArtifactSchema;
};

const calloutTargetNode = (id: string): IRChild => ({
  type: 'node',
  id,
  position: [0, 0],
  shape: 'rectangle',
  boundary: 'shape',
  minimumSize: { width: 40, height: 20 },
  padding: 0,
});

const compileCalloutArtifact = () =>
  compileToScene(
    sceneOf([
      calloutTargetNode('artifact-callout-target'),
      Standard.createCallout({
        id: 'artifact-callout',
        target: { id: 'artifact-callout-target' },
        content: calloutTargetNode('artifact-callout-content'),
        placement: { side: 'right' },
      }),
    ]),
    { composites: [calloutDefinitionOf()], padding: 0 },
  );

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

const compileRoot = (root: IRChild, definitions: ReadonlyArray<AnyCompositeDefinition>) =>
  compileToScene(sceneOf([root]), { composites: definitions, padding: 0 });

describe('semantic logic artifact contracts', () => {
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

  it('exposes four distinct typed artifact shapes', () => {
    expectTypeOf<TerminalArtifact['content']>().toEqualTypeOf<LogicLayoutItemArtifact | null>();
    expectTypeOf<TerminalArtifact['kind']>().toEqualTypeOf<'terminal'>();
    expectTypeOf<StageArtifact['kind']>().toEqualTypeOf<'stage'>();
    expectTypeOf<DecisionArtifact['kind']>().toEqualTypeOf<'decision'>();
    expectTypeOf<JunctionArtifact['kind']>().toEqualTypeOf<'junction'>();
  });

  it.each([
    [
      'terminal',
      TerminalArtifactSchema,
      createTerminal({ id: 'artifact-terminal', role: 'start' }),
      TerminalDefinition,
    ],
    [
      'stage',
      StageArtifactSchema,
      createStage({ id: 'artifact-stage', category: 'phase', content: child('artifact-stage-content') }),
      StageDefinition,
    ],
    [
      'decision',
      DecisionArtifactSchema,
      createDecision({ id: 'artifact-decision', content: child('artifact-decision-content') }),
      DecisionDefinition,
    ],
    [
      'junction',
      JunctionArtifactSchema,
      createJunction({ id: 'artifact-junction', role: 'merge' }),
      JunctionDefinition,
    ],
  ] as const)('round-trips the %s artifact and rejects unknown fields', (type, schema, value, definition) => {
    const artifact = schema.parse(compositeArtifact(compileRoot(value, [definition]), type).value);
    expect(schema.parse(JSON.parse(JSON.stringify(artifact)))).toEqual(artifact);
    expect(() => schema.parse({ ...artifact, extra: true })).toThrow();
    expect(Object.keys(artifact.container).sort()).toEqual([
      'allocationBounds',
      'contentBounds',
      'visibleBounds',
      'visualBounds',
    ]);
  });

  it('merges shell and content geometry in outer bounds while keeping container content-only', () => {
    const stage = createStage({
      id: 'artifact-shell-content',
      category: 'phase',
      content: createProbeLeaf('artifact-overflow-child', {
        visualX: -12,
        visualY: -8,
        visualWidth: 80,
        visualHeight: 70,
      }),
      appearance: { size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 30 } } },
    });
    const output = compileRoot(stage, [StageDefinition, createProbeLeafDefinition()]);
    const artifact = StageArtifactSchema.parse(compositeArtifact(output, 'stage').value);

    expect(artifact.content).not.toBeNull();
    expect(artifact.outer.shellVisualBounds).not.toBeNull();
    expect(artifact.outer.visualBounds.width).toBeGreaterThanOrEqual(artifact.outer.shellVisualBounds?.width ?? 0);
    expect(artifact.outer.visualBounds.height).toBeGreaterThanOrEqual(artifact.outer.shellVisualBounds?.height ?? 0);
    expect(artifact.outer.visualBounds.width).toBeGreaterThan(artifact.outer.allocationBounds.width);
    expect(artifact.outer.visualBounds.height).toBeGreaterThan(artifact.outer.allocationBounds.height);
    expect(artifact.container).not.toHaveProperty('shellVisualBounds');
    expect(artifact.container).not.toHaveProperty('appearance');
  });

  it('keeps visual overflow visible for visible containers and clips only visible bounds', () => {
    const visible = createStage({
      id: 'artifact-visible',
      content: createProbeLeaf('visible-child', { visualX: -20, visualY: -10, visualWidth: 90, visualHeight: 80 }),
      appearance: {
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 30 } },
        overflow: 'visible',
      },
    });
    const clipped = createStage({
      id: 'artifact-clipped',
      content: createProbeLeaf('clipped-child', { visualX: -20, visualY: -10, visualWidth: 90, visualHeight: 80 }),
      appearance: {
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 30 } },
        overflow: 'clip',
      },
    });
    const visibleArtifact = StageArtifactSchema.parse(
      compositeArtifact(compileRoot(visible, [StageDefinition, createProbeLeafDefinition()]), 'stage').value,
    );
    const clippedArtifact = StageArtifactSchema.parse(
      compositeArtifact(compileRoot(clipped, [StageDefinition, createProbeLeafDefinition()]), 'stage').value,
    );

    expect(visibleArtifact.outer.visualBounds.width).toBeGreaterThan(visibleArtifact.outer.allocationBounds.width);
    expect(clippedArtifact.outer.visualBounds.width).toBeGreaterThan(clippedArtifact.outer.allocationBounds.width);
    expect(clippedArtifact.container.visibleBounds).toEqual(clippedArtifact.container.allocationBounds);
    expect(clippedArtifact.outer.visibleBounds).toEqual(clippedArtifact.outer.shellVisualBounds);
    expect(visibleArtifact.outer.visibleBounds).not.toEqual(clippedArtifact.outer.visibleBounds);
  });

  it('keeps the resolved content rect for no-content Terminal and Junction artifacts', () => {
    const terminal = TerminalArtifactSchema.parse(
      compositeArtifact(
        compileRoot(createTerminal({ id: 'artifact-empty-terminal', role: 'end' }), [TerminalDefinition]),
        'terminal',
      ).value,
    );
    const junction = JunctionArtifactSchema.parse(
      compositeArtifact(
        compileRoot(createJunction({ id: 'artifact-empty-junction' }), [JunctionDefinition]),
        'junction',
      ).value,
    );

    expect(terminal.content).toBeNull();
    expect(junction.content).toBeNull();
    expect(terminal.container.contentBounds).toEqual({ x: 12, y: 6, width: 24, height: 12 });
    expect(junction.container.contentBounds).toEqual({ x: 0, y: 0, width: 8, height: 8 });
    expect(terminal.outer.shellVisualBounds).not.toBeNull();
    expect(junction.outer.shellVisualBounds).not.toBeNull();
    expect(terminal.outer.visibleBounds).not.toBeNull();
    expect(junction.outer.visibleBounds).not.toBeNull();
  });

  it('drops fully invisible shell bounds while retaining visible content geometry', () => {
    const invisibleStage = StageArtifactSchema.parse(
      compositeArtifact(
        compileRoot(
          createStage({
            id: 'artifact-invisible-shell',
            content: child('artifact-visible-content'),
            appearance: { style: { opacity: 0 } },
          }),
          [StageDefinition],
        ),
        'stage',
      ).value,
    );
    const invisibleJunction = JunctionArtifactSchema.parse(
      compositeArtifact(
        compileRoot(createJunction({ id: 'artifact-invisible-junction', appearance: { style: { opacity: 0 } } }), [
          JunctionDefinition,
        ]),
        'junction',
      ).value,
    );

    expect(invisibleStage.outer.shellVisualBounds).toBeNull();
    expect(invisibleStage.outer.visualBounds).toEqual(invisibleStage.container.visualBounds);
    expect(invisibleStage.outer.visibleBounds).toEqual(invisibleStage.container.visibleBounds);
    expect(invisibleStage.outer.visibleBounds).not.toBeNull();
    expect(invisibleJunction.outer.shellVisualBounds).toBeNull();
    expect(invisibleJunction.outer.visualBounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(invisibleJunction.outer.visibleBounds).toBeNull();
  });

  it('preserves content artifact allocation, visual, visible, and overflow fields through JSON', () => {
    const stage = createStage({
      id: 'artifact-content-fields',
      content: createProbeLeaf('artifact-content', { visualX: -5, visualY: -4, visualWidth: 40, visualHeight: 30 }),
    });
    const artifact = StageArtifactSchema.parse(
      compositeArtifact(compileRoot(stage, [StageDefinition, createProbeLeafDefinition()]), 'stage').value,
    );
    expect(artifact.content.allocationBounds.width).toBeGreaterThan(0);
    expect(artifact.content.visualBounds.width).toBeGreaterThan(artifact.content.allocationBounds.width);
    expect(artifact.content.visibleBounds).not.toBeNull();
    expect(artifact.content.overflow).toMatchObject({ allocation: expect.any(Object), visual: expect.any(Object) });
    expect(JSON.parse(JSON.stringify(artifact))).toEqual(artifact);
  });

  it('does not manufacture content text or renderer-specific artifact branches', () => {
    const output = compileRoot(createJunction({ id: 'artifact-no-content-junction', role: 'join' }), [
      JunctionDefinition,
    ]);
    const artifact = JunctionArtifactSchema.parse(compositeArtifact(output, 'junction').value);

    expect(artifact.content).toBeNull();
    expect(JSON.stringify(artifact)).not.toMatch(/renderer|svg|canvas|text/i);
  });

  it('uses a real Core probe/replay harness for deterministic children', () => {
    const stage = createStage({
      id: 'artifact-replay-stage',
      content: createProbeLeaf('artifact-replay-child'),
    });
    const output = compileRoot(stage, [StageDefinition, createProbeLeafDefinition()]);
    const artifact = StageArtifactSchema.parse(compositeArtifact(output, 'stage').value);

    expect(artifact.content).not.toBeNull();
    expect(artifact.outer.allocationBounds.width).toBeGreaterThan(0);
    expect(artifact.outer.allocationBounds.height).toBeGreaterThan(0);
    expect(naturalProposal.x.kind).toBe('intrinsic');
  });
});

describe('Callout typed artifact contract', () => {
  beforeAll(() => {
    expect(calloutProduction.CalloutDefinition, 'production mutation required: CalloutDefinition').toBeDefined();
    expect(
      calloutProduction.CalloutArtifactSchema,
      'production mutation required: CalloutArtifactSchema',
    ).toBeDefined();
  });

  it('exposes a compile Definition with a strict JSON artifact schema', () => {
    const definition = calloutDefinitionOf();
    const schema = calloutArtifactSchemaOf();
    const output = compileCalloutArtifact();
    const envelope = output.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'standard' && artifact.type === 'callout',
    );
    if (envelope === undefined || envelope.kind !== 'composite') throw new Error('Expected Callout artifact envelope');
    const artifact = schema.parse(envelope.value) as CalloutArtifact;

    expectTypeOf(definition).toMatchTypeOf<AnyCompositeDefinition>();
    expect(definition.compile).toEqual(expect.any(Function));
    expect(definition.expand).toBeUndefined();
    expect(definition.artifactSchema).toBeDefined();
    expect(Object.keys(artifact).sort()).toEqual([
      'container',
      'content',
      'id',
      'kind',
      'leader',
      'outer',
      'placement',
      'target',
    ]);
    expect(artifact.kind).toBe('callout');
    expect(artifact.id).toBe('artifact-callout');
    expect(schema.parse(JSON.parse(JSON.stringify(artifact)))).toEqual(artifact);
    expect(() => schema.parse({ ...artifact, extra: true })).toThrow();
    expect(() =>
      schema.parse({
        ...artifact,
        placement: { side: 'right', offset: 0 },
      }),
    ).toThrow();
    expect(() =>
      schema.parse({
        ...artifact,
        placement: { side: 'right', gap: 8 },
      }),
    ).toThrow();
  });
});
