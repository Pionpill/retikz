import { describe, expect, it } from 'vitest';
import { literal, string } from 'zod';

import type { IRScene } from '../../src';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
} from '../../src';

const child = defineComposite({
  namespace: 'third',
  type: 'child',
  schema: CompositeBaseSchema.extend({
    namespace: literal('third'),
    type: literal('child'),
    id: string().optional(),
  }),
  expand: () => ({
    children: [{ type: 'node', position: [5, 5], minimumWidth: 10, minimumHeight: 10 }],
    spatialHandles: [{ key: 'body', role: 'child', bounds: { x: 0, y: 0, width: 10, height: 10 } }],
  }),
});

const parent = defineComposite({
  namespace: 'third',
  type: 'parent',
  schema: CompositeBaseSchema.extend({
    namespace: literal('third'),
    type: literal('parent'),
    id: string().optional(),
  }),
  compile: (_node, context) => {
    const probe = context.layoutChild(
      { namespace: 'third', type: 'child', id: 'inner' },
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 10 },
        y: { kind: LayoutAxisProposalKind.Exact, value: 10 },
      },
    );
    if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
    return {
      children: [
        context.scope(
          { transforms: [{ kind: 'translate', x: 7, y: 8 }] },
          [context.replay(probe.result, { transforms: [{ kind: 'translate', x: 30, y: 40 }] })],
          [{ key: 'frame', role: 'parent', bounds: { x: 0, y: 0, width: 10, height: 10 } }],
        ),
      ],
    };
  },
});

describe('spatial handle layout replay', () => {
  it('remaps probe occurrence and applies replay plus outer Scope transforms once', () => {
    const scene: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 2, y: 3 }],
          children: [{ namespace: 'third', type: 'parent', id: 'outer' }],
        },
      ],
    };

    const handles = compileToScene(scene, { composites: [parent, child] }).spatialHandles.entries;
    const [parentHandle, childHandle] = handles;

    expect(handles.map(handle => handle.role)).toEqual(['parent', 'child']);
    expect(parentHandle.geometry.bounds).toEqual({ x: 9, y: 11, width: 10, height: 10 });
    expect(childHandle.geometry.bounds).toEqual({ x: 39, y: 51, width: 10, height: 10 });
    expect(childHandle.ownerPath.map(owner => [owner.type, owner.instanceId])).toEqual([
      ['parent', 'outer'],
      ['child', 'inner'],
    ]);
    expect(childHandle.finalOccurrence.expansionPath.some(segment => segment.kind === 'replay')).toBe(true);
    expect(childHandle.originOccurrence.expansionPath.some(segment => segment.kind === 'probe')).toBe(true);
    expect(childHandle.finalOccurrence).not.toEqual(childHandle.originOccurrence);
  });
});
