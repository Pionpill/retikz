import { describe, expect, it } from 'vitest';
import { number, strictObject } from 'zod';

import * as Graph from '../../src';

describe('Entity definition registry', () => {
  it('registers seven builtin roles whose definitions directly own Node structure', () => {
    const registry = Graph.resolveEntityRoleRegistry();

    expect([...registry.keys()]).toEqual([
      'participant',
      'activity',
      'event',
      'state',
      'gateway',
      'resource',
      'concept',
    ]);
    expect(registry.get('participant')).toMatchObject({
      role: 'participant',
      shape: { type: 'hexagon' },
      padding: { x: 0, y: 8 },
      minimumSize: { width: 72, height: 36 },
    });
    expect(registry.get('participant')?.shape).toEqual({ type: 'hexagon' });
    expect(registry.get('activity')).toMatchObject({ shape: 'rectangle', cornerRadius: 6, padding: 8 });
    expect(registry.get('event')).toMatchObject({
      shape: 'circle',
      padding: 6,
      minimumSize: { width: 32, height: 32 },
    });
    expect(registry.get('state')).toMatchObject({
      shape: 'rectangle',
      cornerRadius: 999,
      padding: { x: 12, y: 8 },
      minimumSize: { width: 56, height: 28 },
    });
    expect(registry.get('gateway')).toMatchObject({
      shape: { type: 'diamond', params: { aspectRatio: 1.8 } },
      padding: { x: 6, y: 4 },
    });
    expect(registry.get('resource')).toMatchObject({
      shape: { type: 'ellipticCapsule', params: { axis: 'vertical', capDepth: 8 } },
      padding: { x: 10, y: 5 },
      minimumSize: { width: 56, height: 40 },
    });
    expect(registry.get('concept')).toMatchObject({
      shape: 'ellipse',
      padding: { x: 8, y: 6 },
      minimumSize: { width: 56, height: 36 },
    });
    expect(registry.get('participant')).not.toHaveProperty('presentation');
  });

  it('keeps kind and predicate as semantic definitions', () => {
    const role = Graph.defineEntityRole({
      role: 'service',
      description: 'A deployed service',
      shape: 'rectangle',
      padding: 8,
    });
    const kind = Graph.defineEntityKind({
      kind: 'service.api',
      role: 'service',
      description: 'An API service',
    });
    const predicate = Graph.defineEntityPredicate({
      name: 'replicas',
      role: 'service',
      kinds: ['service.api'],
      description: 'Deployment replica count',
      paramsSchema: strictObject({ count: number().int().positive() }),
    });
    expect(Graph.defineEntityRole(role)).toBe(role);
    expect(Graph.defineEntityKind(kind)).toBe(kind);
    expect(Graph.defineEntityPredicate(predicate)).toBe(predicate);
    expect(kind).not.toHaveProperty('presentation');
    expect(predicate).not.toHaveProperty('resolvePresentation');
  });

  it('validates parent-role constraints and duplicate custom keys through one option assembly', () => {
    const missingRoleKind = Graph.defineEntityKind({
      kind: 'unknown.kind',
      role: 'unknown',
      description: 'Invalid parent role',
    });
    const wrongKindPredicate = Graph.defineEntityPredicate({
      name: 'wrong-kind',
      role: 'participant',
      kinds: ['workflow.start'],
      description: 'Invalid kind owner',
      paramsSchema: strictObject({}),
    });
    const kind = Graph.defineEntityKind({
      kind: 'workflow.start',
      role: 'event',
      description: 'Workflow start event',
    });

    expect(() => Graph.resolveGraphDefinitionOptions({ entityKinds: [missingRoleKind] })).toThrow(/unknown.*role/i);
    expect(() => Graph.resolveGraphDefinitionOptions({ entityPredicates: [wrongKindPredicate] })).toThrow(
      /workflow\.start.*kind|kind.*workflow\.start/i,
    );
    expect(() => Graph.resolveGraphDefinitionOptions({ entityKinds: [kind, { ...kind }] })).toThrowError(
      expect.objectContaining({
        code: Graph.RetikzGraphErrorCode.DefinitionDuplicate,
        details: { capability: 'entity-kind', key: 'workflow.start' },
      }),
    );
  });
});
