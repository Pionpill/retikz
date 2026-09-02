import { describe, expect, it } from 'vitest';
import { boolean, strictObject } from 'zod';

import * as Graph from '../../src';

describe('Relation definition registry', () => {
  it('registers UML builtin kinds with their standard path and endpoint structures', () => {
    const roles = Graph.resolveRelationRoleRegistry();
    const kinds = Graph.resolveRelationKindRegistry(undefined, roles);

    expect([...roles.keys()]).toEqual(['association', 'dependency', 'generalization', 'flow', 'influence']);
    expect(roles.get('association')).toMatchObject({
      defaultDirection: 'forward',
      allowedDirections: ['none', 'forward', 'reverse', 'both'],
      directions: {
        none: { sourceMarker: false, targetMarker: false, dashPattern: false },
        forward: { sourceMarker: false, targetMarker: { shape: 'diamond' }, dashPattern: false },
        reverse: { sourceMarker: { shape: 'diamond' }, targetMarker: false, dashPattern: false },
        both: { sourceMarker: { shape: 'diamond' }, targetMarker: { shape: 'diamond' }, dashPattern: false },
      },
    });
    expect(roles.get('dependency')?.directions.forward).toEqual({
      sourceMarker: false,
      targetMarker: { shape: 'straightBarb' },
      dashPattern: false,
    });
    expect(roles.get('generalization')?.directions.forward).toEqual({
      sourceMarker: false,
      targetMarker: { shape: 'normal' },
      dashPattern: false,
    });
    expect(roles.get('flow')?.directions).toMatchObject({
      forward: { sourceMarker: false, targetMarker: { shape: 'stealth' }, dashPattern: false },
      reverse: { sourceMarker: { shape: 'stealth' }, targetMarker: false, dashPattern: false },
      both: { sourceMarker: { shape: 'stealth' }, targetMarker: { shape: 'stealth' }, dashPattern: false },
    });
    expect(roles.get('influence')?.directions.forward?.targetMarker).toEqual({ shape: 'circle' });

    expect([...kinds.keys()]).toEqual([
      'uml.association',
      'uml.aggregation',
      'uml.composition',
      'uml.generalization',
      'uml.dependency',
      'uml.realization',
    ]);
    expect(kinds.get('uml.association')).toMatchObject({
      role: 'association',
      defaultDirection: 'none',
      allowedDirections: ['none'],
      directions: { none: { sourceMarker: false, targetMarker: false, dashPattern: false } },
    });
    expect(kinds.get('uml.aggregation')).toMatchObject({
      role: 'association',
      defaultDirection: 'none',
      allowedDirections: ['none'],
      directions: { none: { sourceMarker: { shape: 'openDiamond' }, targetMarker: false, dashPattern: false } },
    });
    expect(kinds.get('uml.composition')?.directions?.none?.sourceMarker).toEqual({ shape: 'diamond' });
    expect(kinds.get('uml.generalization')).toMatchObject({
      role: 'generalization',
      directions: { forward: { targetMarker: { shape: 'open' } } },
    });
    expect(kinds.get('uml.dependency')).toMatchObject({
      role: 'dependency',
      directions: { forward: { dashPattern: [6, 4] } },
    });
    expect(kinds.get('uml.realization')).toMatchObject({
      role: 'dependency',
      directions: { forward: { targetMarker: { shape: 'open' }, dashPattern: [6, 4] } },
    });
    for (const removedKind of [
      'provenance.derivation',
      'uml.usage',
      'uml.abstraction',
      'uml.binding',
      'uml.permission',
      'uml.manifestation',
      'uml.deployment',
      'uml.substitution',
    ]) {
      expect(kinds.has(removedKind)).toBe(false);
    }
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
      paramsSchema: strictObject({ open: boolean() }),
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
