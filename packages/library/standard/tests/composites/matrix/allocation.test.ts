import type { AnyCompositeDefinition, IRChild, LayoutChildResult, LayoutProposal } from '@retikz/core';
import { ChildSchema, CompositeBaseSchema, compileToScene, defineComposite, LayoutChildProbeKind } from '@retikz/core';
import { PathClipDefinition } from '@retikz/extension';
import { intrinsicLayoutProposal } from '@retikz/layout/compose';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { ArrayDefinition, MapDefinition, MatrixDefinition } from '../../../src/collection';

const compile = (
  child: IRChild,
  proposal: LayoutProposal = intrinsicLayoutProposal('natural'),
  extra: Array<AnyCompositeDefinition> = [],
) => {
  let observed: LayoutChildResult | undefined;
  const harness = defineComposite({
    namespace: 'cell-test',
    type: 'harness',
    schema: CompositeBaseSchema.extend({
      namespace: literal('cell-test'),
      type: literal('harness'),
      child: ChildSchema,
    }),
    compile: (node, context) => {
      const probe = context.layoutChild(node.child, proposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
      observed = probe.result;
      return { children: [context.replay(probe.result)] };
    },
  });
  const scene = compileToScene(
    { type: 'scene', version: 1, children: [{ namespace: 'cell-test', type: 'harness', child }] },
    {
      composites: [harness, ArrayDefinition, MapDefinition, MatrixDefinition, ...extra],
      clips: [PathClipDefinition],
      padding: 0,
    },
  );
  if (observed === undefined) throw new Error('No layout result');
  return { scene, observed };
};

describe('Matrix parent allocation', () => {
  const source = {
    namespace: 'standard',
    type: 'matrix',
    id: 'm',
    cellIdMode: 'index',
    skeleton: { rows: 2, columns: 2 },
    layout: { width: 30, height: 20, gap: 2 },
  };
  it('keeps cell sizes when parent gives surplus space', () => {
    const result = compile(source, { x: { kind: 'exact', value: 100 }, y: { kind: 'range', min: 80, max: 100 } });
    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 100, height: 80 });
    expect(
      result.scene.spatialHandles.entries.filter(e => e.role === 'matrix-cell').map(e => e.geometry.bounds),
    ).toEqual([
      { x: 0, y: 0, width: 30, height: 20 },
      { x: 32, y: 0, width: 30, height: 20 },
      { x: 0, y: 22, width: 30, height: 20 },
      { x: 32, y: 22, width: 30, height: 20 },
    ]);
  });
  it('rejects a parent smaller than the required tracks', () => {
    expect(() => compile(source, { x: { kind: 'exact', value: 20 }, y: { kind: 'exact', value: 80 } })).toThrow();
  });
});
