import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import * as Graph from '../../src';

describe('Relation definition registry', () => {
  it('registers five solid builtin role families and four stable kind structure deltas', () => {
    const roles = Graph.resolveRelationRoleRegistry();
    const kinds = Graph.resolveRelationKindRegistry(undefined, roles);

    expect([...roles.keys()]).toEqual(['association', 'dependency', 'generalization', 'flow', 'influence']);
    expect(roles.get('association')).toMatchObject({
      defaultDirection: 'none',
      allowedDirections: ['none', 'forward', 'reverse', 'both'],
      directions: {
        none: { sourceMarker: false, targetMarker: false, dashPattern: false },
        forward: { sourceMarker: false, targetMarker: { shape: 'kite' }, dashPattern: false },
        reverse: { sourceMarker: { shape: 'kite' }, targetMarker: false, dashPattern: false },
        both: { sourceMarker: { shape: 'kite' }, targetMarker: { shape: 'kite' }, dashPattern: false },
      },
    });
    expect(roles.get('dependency')?.directions.forward?.targetMarker).toEqual({ shape: 'stealth' });
    expect(roles.get('generalization')?.directions.forward?.targetMarker).toEqual({ shape: 'normal' });
    expect(roles.get('flow')?.directions.forward?.targetMarker).toEqual({ shape: 'circle' });
    expect(roles.get('influence')?.directions.forward?.targetMarker).toEqual({ shape: 'square' });

    expect([...kinds.keys()]).toEqual([
      'uml.aggregation',
      'uml.composition',
      'uml.realization',
      'provenance.derivation',
    ]);
    expect(kinds.get('uml.aggregation')).toMatchObject({
      role: 'association',
      defaultDirection: 'none',
      allowedDirections: ['none'],
      directions: { none: { sourceMarker: { shape: 'openDiamond' }, targetMarker: false, dashPattern: false } },
    });
    expect(kinds.get('uml.composition')?.directions?.none?.sourceMarker).toEqual({ shape: 'diamond' });
    expect(kinds.get('uml.realization')?.directions?.forward?.targetMarker).toEqual({ shape: 'open' });
    expect(kinds.get('provenance.derivation')?.directions?.forward?.targetMarker).toEqual({ shape: 'openStealth' });
  });

  it('keeps Relation role/kind/predicate structure in semantic definitions', () => {
    const role = Graph.defineRelationRole({
      role: 'ownership',
      description: 'Ownership relation',
      defaultDirection: 'forward',
      allowedDirections: ['forward'],
      directions: {
        forward: { sourceMarker: false, targetMarker: { shape: 'normal' }, dashPattern: false },
      },
    });
    const invalidKind = Graph.defineRelationKind({
      kind: 'ownership.shared',
      role: 'ownership',
      description: 'Invalid expanded direction',
      allowedDirections: ['forward', 'both'],
    });
    const duplicateDirectionRole = Graph.defineRelationRole({
      role: 'duplicate-direction',
      description: 'Invalid duplicate direction set',
      defaultDirection: 'forward',
      allowedDirections: ['forward', 'forward'],
      directions: {
        forward: { sourceMarker: false, targetMarker: { shape: 'normal' }, dashPattern: false },
      },
    });
    const predicate = Graph.defineRelationPredicate({
      name: 'confidence',
      role: 'ownership',
      description: 'Ownership confidence',
      paramsSchema: z.strictObject({ open: z.boolean() }),
      resolveStructure: params => ({ targetMarker: { shape: params.open ? 'open' : 'normal' } }),
    });
    expect(Graph.defineRelationRole(role)).toBe(role);
    expect(Graph.defineRelationPredicate(predicate)).toBe(predicate);
    expect(() => Graph.resolveGraphDefinitionOptions({ relationRoles: [role], relationKinds: [invalidKind] })).toThrow(
      /both.*direction|direction.*both/i,
    );
    expect(() => Graph.resolveGraphDefinitionOptions({ relationRoles: [duplicateDirectionRole] })).toThrow(
      /duplicate.*direction|direction.*duplicate/i,
    );
  });
});
