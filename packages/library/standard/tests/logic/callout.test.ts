import type { AnyCompositeDefinition, IRChild, ScenePrimitive } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { beforeAll, describe, expect, it } from 'vitest';

import * as Standard from '../../src';
import { createProbeLeaf, createProbeLeafDefinition, pathPrimitivesOf } from './test-utils';

type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;

type CalloutLeaderArtifact = Readonly<{
  from: [number, number];
  to: [number, number];
  visualBounds: Rect;
}>;

type CalloutArtifact = Readonly<{
  kind: 'callout';
  id: string;
  target: Standard.LogicDiagramTarget;
  placement: Standard.CalloutPlacement;
  outer: Standard.LogicOuterArtifact;
  container: Readonly<{
    allocationBounds: Rect;
    contentBounds: Rect;
    visualBounds: Rect;
    visibleBounds: Rect | null;
  }>;
  content: Standard.LogicLayoutItemArtifact;
  leader: CalloutLeaderArtifact | null;
}>;

const calloutDefinitionOf = (): AnyCompositeDefinition => Standard.CalloutDefinition;

const sceneOf = (children: ReadonlyArray<IRChild>) => ({
  version: 1 as const,
  type: 'scene' as const,
  children: Array.from(children),
});

const node = (id: string, position: [number, number] = [0, 0], width = 40, height = 20): IRChild => ({
  type: 'node',
  id,
  position,
  shape: 'rectangle',
  boundary: 'shape',
  minimumSize: { width, height },
  padding: 0,
});

const callout = (input: Parameters<typeof Standard.createCallout>[0]): IRChild => Standard.createCallout(input);

const compileCallout = (
  children: ReadonlyArray<IRChild>,
  definitions: ReadonlyArray<AnyCompositeDefinition> = [],
): ReturnType<typeof compileToScene> =>
  compileToScene(sceneOf(children), {
    composites: [calloutDefinitionOf(), ...definitions],
    padding: 0,
  });

const artifactOf = (output: ReturnType<typeof compileToScene>): CalloutArtifact => {
  const artifact = output.artifacts.find(
    value => value.kind === 'composite' && value.namespace === 'standard' && value.type === 'callout',
  );
  if (artifact === undefined || artifact.kind !== 'composite') throw new Error('Expected Callout artifact');
  return artifact.value as CalloutArtifact;
};

const pathOf = (output: ReturnType<typeof compileToScene>): Extract<ScenePrimitive, { type: 'path' }> | undefined =>
  pathPrimitivesOf(output.scene.primitives)[0];

const translateOf = (primitive: Extract<ScenePrimitive, { type: 'group' }>): [number, number] =>
  (primitive.transforms ?? []).reduce<[number, number]>(
    (total, transform) => (transform.kind === 'translate' ? [total[0] + transform.x, total[1] + transform.y] : total),
    [0, 0],
  );

const worldPrimitiveOf = (
  primitives: ReadonlyArray<ScenePrimitive>,
  id: string,
  parentTranslation: [number, number] = [0, 0],
): { primitive: ScenePrimitive; translation: [number, number] } | undefined => {
  for (const primitive of primitives) {
    const translation: [number, number] =
      primitive.type === 'group'
        ? [parentTranslation[0] + translateOf(primitive)[0], parentTranslation[1] + translateOf(primitive)[1]]
        : parentTranslation;
    if (primitive.id === id) return { primitive, translation };
    if (primitive.type === 'group') {
      const nested = worldPrimitiveOf(primitive.children, id, translation);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
};

const shellWorldAnchor = (
  output: ReturnType<typeof compileToScene>,
  id: string,
  side: 'top' | 'right' | 'bottom' | 'left',
): [number, number] => {
  const located = worldPrimitiveOf(output.scene.primitives, id);
  if (located === undefined || located.primitive.type !== 'rect') throw new Error(`Expected shell rect '${id}'`);
  const rect = located.primitive;
  const x = rect.x + located.translation[0];
  const y = rect.y + located.translation[1];
  const centerX = x + rect.width / 2;
  const centerY = y + rect.height / 2;
  if (side === 'top') return [centerX, y];
  if (side === 'right') return [x + rect.width, centerY];
  if (side === 'bottom') return [centerX, y + rect.height];
  return [x, centerY];
};

const vectorOf = (from: [number, number], to: [number, number]): [number, number] => [to[0] - from[0], to[1] - from[1]];

const expectFiniteRect = (rect: Rect): void => {
  expect([rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)).toBe(true);
  expect(rect.width).toBeGreaterThanOrEqual(0);
  expect(rect.height).toBeGreaterThanOrEqual(0);
};

describe('Callout placement and leader contract', () => {
  beforeAll(() => {
    expect(Standard.CalloutDefinition, 'production mutation required: CalloutDefinition').toBeDefined();
  });

  it.each([
    {
      side: 'top' as const,
      delta: [0, -8] as [number, number],
      opposite: 'bottom' as const,
      shellAnchor: [0, -18] as [number, number],
    },
    {
      side: 'right' as const,
      delta: [8, 0] as [number, number],
      opposite: 'left' as const,
      shellAnchor: [28, 0] as [number, number],
    },
    {
      side: 'bottom' as const,
      delta: [0, 8] as [number, number],
      opposite: 'top' as const,
      shellAnchor: [0, 18] as [number, number],
    },
    {
      side: 'left' as const,
      delta: [-8, 0] as [number, number],
      opposite: 'right' as const,
      shellAnchor: [-28, 0] as [number, number],
    },
  ])('uses the $side default target anchor and opposite shell anchor', ({ side, delta, opposite, shellAnchor }) => {
    const target = { id: `callout-target-${side}` };
    const output = compileCallout([
      node(target.id),
      callout({
        id: `callout-${side}`,
        target,
        content: node(`callout-content-${side}`, [0, 0], 16, 10),
        placement: { side },
      }),
    ]);
    const artifact = artifactOf(output);
    const leader = artifact.leader;

    expect(artifact.target).toEqual(target);
    expect(artifact.placement).toEqual({ side, gap: 8, offset: 0 });
    expect(leader).not.toBeNull();
    if (leader === null) return;
    expect(vectorOf(leader.from, leader.to)).toEqual(delta);
    expect(shellWorldAnchor(output, `callout-${side}`, opposite)).toEqual(shellAnchor);
  });

  it('preserves an explicit target anchor while retaining the side normal and shell opposite anchor', () => {
    const target = { id: 'callout-explicit-anchor-target', anchor: 'right' as const };
    const output = compileCallout([
      node(target.id),
      callout({
        id: 'callout-explicit-anchor',
        target,
        content: node('callout-explicit-content', [0, 0], 16, 10),
        placement: { side: 'top' },
      }),
    ]);
    const artifact = artifactOf(output);

    expect(artifact.target).toEqual(target);
    expect(artifact.leader).not.toBeNull();
    if (artifact.leader === null) return;
    expect(vectorOf(artifact.leader.from, artifact.leader.to)).toEqual([0, -8]);
    expectFiniteRect(artifact.leader.visualBounds);
    expect(shellWorldAnchor(output, 'callout-explicit-anchor', 'bottom')).toEqual([20, -8]);
  });

  it('adds placement offset along the side tangent after applying the normal gap', () => {
    const cases = [
      { side: 'top' as const, expected: [6, -12] as [number, number] },
      { side: 'right' as const, expected: [12, 6] as [number, number] },
      { side: 'bottom' as const, expected: [6, 12] as [number, number] },
      { side: 'left' as const, expected: [-12, 6] as [number, number] },
    ] as const;
    cases.forEach(({ side, expected }) => {
      const target = { id: `offset-target-${side}` };
      const artifact = artifactOf(
        compileCallout([
          node(target.id),
          callout({
            id: `offset-callout-${side}`,
            target,
            content: node(`offset-content-${side}`, [0, 0], 16, 10),
            placement: { side, gap: 12, offset: 6 },
          }),
        ]),
      );
      expect(artifact.placement).toEqual({ side, gap: 12, offset: 6 });
      expect(artifact.leader).not.toBeNull();
      if (artifact.leader !== null) expect(vectorOf(artifact.leader.from, artifact.leader.to)).toEqual(expected);
    });
  });

  it('moves only world placement for target offset while retaining local bounds and leader vector', () => {
    const baseTarget = { id: 'target-offset-base', anchor: 'top' as const };
    const shiftedTarget = { id: 'target-offset-shifted', anchor: 'top' as const, offset: [24, 11] as [number, number] };
    const base = compileCallout([
      node(baseTarget.id),
      callout({
        id: 'callout-offset-base',
        target: baseTarget,
        content: node('content-offset-base', [0, 0], 16, 10),
        placement: { side: 'top' },
      }),
    ]);
    const shifted = compileCallout([
      node(shiftedTarget.id),
      callout({
        id: 'callout-offset-shifted',
        target: shiftedTarget,
        content: node('content-offset-shifted', [0, 0], 16, 10),
        placement: { side: 'top' },
      }),
    ]);
    const baseArtifact = artifactOf(base);
    const shiftedArtifact = artifactOf(shifted);

    expect(shiftedArtifact.outer).toEqual(baseArtifact.outer);
    expect(shiftedArtifact.container).toEqual(baseArtifact.container);
    expect(shiftedArtifact.leader?.visualBounds).toEqual(baseArtifact.leader?.visualBounds);
    expect(shiftedArtifact.leader && baseArtifact.leader).not.toBeNull();
    if (shiftedArtifact.leader !== null && baseArtifact.leader !== null) {
      expect(vectorOf(shiftedArtifact.leader.from, shiftedArtifact.leader.to)).toEqual(
        vectorOf(baseArtifact.leader.from, baseArtifact.leader.to),
      );
    }
    const baseAnchor = shellWorldAnchor(base, 'callout-offset-base', 'bottom');
    const shiftedAnchor = shellWorldAnchor(shifted, 'callout-offset-shifted', 'bottom');
    expect([shiftedAnchor[0] - baseAnchor[0], shiftedAnchor[1] - baseAnchor[1]]).toEqual([24, 11]);
  });

  it('keeps default and empty leaders arrowless, preserves custom marks, and supports leader false', () => {
    const compile = (id: string, leader?: false | Standard.ConnectorAppearanceInput) =>
      compileCallout([
        node(`${id}-target`),
        callout({
          id,
          target: { id: `${id}-target` },
          content: node(`${id}-content`, [0, 0], 16, 10),
          placement: { side: 'right' },
          ...(leader === undefined ? {} : { leader }),
        }),
      ]);
    const defaultOutput = compile('leader-default');
    const emptyOutput = compile('leader-empty', {});
    const customOutput = compile('leader-custom', { marks: [{ pos: 1, mark: { kind: 'arrow' } }] });
    const disabledOutput = compile('leader-disabled', false);

    const defaultArtifact = artifactOf(defaultOutput);
    const emptyArtifact = artifactOf(emptyOutput);
    const customArtifact = artifactOf(customOutput);
    const disabledArtifact = artifactOf(disabledOutput);
    expect(defaultArtifact.leader).not.toBeNull();
    expect(emptyArtifact.leader).not.toBeNull();
    expect(customArtifact.leader).not.toBeNull();
    expect(disabledArtifact.leader).toBeNull();
    expect(pathOf(defaultOutput)?.arrowStart).toBeUndefined();
    expect(pathOf(defaultOutput)?.arrowEnd).toBeUndefined();
    expect(pathOf(emptyOutput)?.arrowStart).toBeUndefined();
    expect(pathOf(emptyOutput)?.arrowEnd).toBeUndefined();
    expect(pathOf(customOutput)?.arrowEnd).toBeDefined();
    expect(pathOf(disabledOutput)).toBeUndefined();
  });

  it('retains local leader endpoints and visual bounds for a zero-axis leader', () => {
    const output = compileCallout([
      node('zero-axis-target'),
      callout({
        id: 'zero-axis-callout',
        target: { id: 'zero-axis-target', anchor: 'top' },
        content: node('zero-axis-content', [0, 0], 16, 10),
        placement: { side: 'top', gap: 0 },
      }),
    ]);
    const artifact = artifactOf(output);

    expect(artifact.leader).not.toBeNull();
    if (artifact.leader === null) return;
    expect(artifact.leader.from).toEqual(artifact.leader.to);
    expect(artifact.leader.from.every(Number.isFinite)).toBe(true);
    expectFiniteRect(artifact.leader.visualBounds);
  });

  it('raises content probe failure instead of producing an empty Callout', () => {
    expect(() =>
      compileCallout(
        [
          node('probe-failure-target'),
          callout({
            id: 'probe-failure-callout',
            target: { id: 'probe-failure-target' },
            content: createProbeLeaf('probe-failure-content', { fail: true }),
            placement: { side: 'right' },
          }),
        ],
        [createProbeLeafDefinition()],
      ),
    ).toThrow(/probe failure|failed|layout/i);
  });

  it('does not clip the shell or leader when content overflow is clipped', () => {
    const output = compileCallout([
      node('overflow-target'),
      callout({
        id: 'overflow-callout',
        target: { id: 'overflow-target' },
        content: node('overflow-content', [0, 0], 16, 10),
        placement: { side: 'right' },
        appearance: {
          size: { x: { kind: 'fixed', value: 16 }, y: { kind: 'fixed', value: 10 } },
          padding: 0,
          overflow: 'clip',
        },
      }),
    ]);
    const artifact = artifactOf(output);

    expect(artifact.leader).not.toBeNull();
    expect(artifact.outer.shellVisualBounds).not.toBeNull();
    expect(artifact.outer.visibleBounds).not.toBeNull();
    expect(pathOf(output)).toBeDefined();
    expect(worldPrimitiveOf(output.scene.primitives, 'overflow-callout')).toBeDefined();
    if (artifact.leader !== null && artifact.outer.visibleBounds !== null) {
      expect(artifact.outer.visibleBounds.width).toBeGreaterThanOrEqual(artifact.leader.visualBounds.width);
      expect(artifact.outer.visibleBounds.height).toBeGreaterThanOrEqual(artifact.leader.visualBounds.height);
    }
  });
});
