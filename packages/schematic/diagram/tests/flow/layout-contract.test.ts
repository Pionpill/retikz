import { describe, expect, it } from 'vitest';

import type { FlowLayoutDefinition } from '../../src/flow';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../src/errors';
import { defineFlowLayout } from '../../src/flow';
import { resolveFlowLayoutRegistry } from '../../src/flow/providers';

const validDefinition = (overrides: Partial<FlowLayoutDefinition> = {}): FlowLayoutDefinition => ({
  name: 'custom',
  description: 'A deterministic custom Flow layout.',
  capabilities: {
    compoundScopes: false,
    groupEndpoints: false,
    crossScopeRelations: false,
    cycles: false,
    selfLoops: false,
    parallelRelations: false,
    relationLabels: false,
    relationDirections: ['forward'],
    routingKinds: ['straight'],
  },
  defaults: {
    direction: 'right',
    nodeGap: 20,
    rankGap: 40,
    routing: { kind: 'straight' },
  },
  layout: input => ({
    elements: input.elements.map(element => ({
      id: element.id,
      bounds: {
        x: 0,
        y: 0,
        width: element.kind === 'leaf' ? element.size.width : element.kind === 'group' ? element.minimumSize.width : 0,
        height:
          element.kind === 'leaf' ? element.size.height : element.kind === 'group' ? element.minimumSize.height : 0,
      },
    })),
    relations: input.relations.map(() => ({
      points: [
        [0, 0],
        [1, 0],
      ],
    })),
  }),
  ...overrides,
});

describe('Flow Layout Definition contract', () => {
  it('keeps the exact Definition object as a typed identity', () => {
    const definition = validDefinition();

    expect(defineFlowLayout(definition)).toBe(definition);
  });

  it('registers a complete synchronous provider contract', () => {
    const definition = validDefinition();
    const resolved = resolveFlowLayoutRegistry({ flowLayouts: [definition], defaultFlowLayout: 'custom' });

    expect(resolved.layouts.get('custom')).toBe(definition);
    expect(resolved.defaultLayout).toBe(definition);
  });

  it('rejects extra Definition and capability fields instead of publishing an open catalog shape', () => {
    const definitionWithExtraField = Object.assign(validDefinition(), { unexpected: true });
    const capabilitiesWithExtraField = Object.assign({}, validDefinition().capabilities, { unexpected: true });

    for (const definition of [
      definitionWithExtraField,
      validDefinition({ capabilities: capabilitiesWithExtraField }),
    ]) {
      expect(() => resolveFlowLayoutRegistry({ flowLayouts: [definition] })).toThrowError(
        expect.objectContaining({ code: RetikzDiagramErrorCode.DefinitionInvalid }),
      );
    }
  });

  it('rejects non-plain capability objects before they reach the runtime catalog', () => {
    const nonPlainCapabilities = Object.assign(new Map(), validDefinition().capabilities);
    const definition = validDefinition({ capabilities: nonPlainCapabilities });

    expect(() => resolveFlowLayoutRegistry({ flowLayouts: [definition] })).toThrowError(
      expect.objectContaining({ code: RetikzDiagramErrorCode.DefinitionInvalid }),
    );
  });

  it.each([
    ['blank name', validDefinition({ name: ' ' })],
    ['blank description', validDefinition({ description: '' })],
    [
      'group endpoint without compound',
      validDefinition({ capabilities: { ...validDefinition().capabilities, groupEndpoints: true } }),
    ],
    [
      'cross scope without compound',
      validDefinition({ capabilities: { ...validDefinition().capabilities, crossScopeRelations: true } }),
    ],
    [
      'empty directions',
      validDefinition({ capabilities: { ...validDefinition().capabilities, relationDirections: [] } }),
    ],
    [
      'duplicate directions',
      validDefinition({
        capabilities: { ...validDefinition().capabilities, relationDirections: ['forward', 'forward'] },
      }),
    ],
    ['empty routing kinds', validDefinition({ capabilities: { ...validDefinition().capabilities, routingKinds: [] } })],
    [
      'unsupported default routing',
      validDefinition({
        defaults: { ...validDefinition().defaults, routing: { kind: 'orthogonal', orthogonalCornerRadius: 4 } },
      }),
    ],
    [
      'missing orthogonal radius',
      validDefinition({
        capabilities: { ...validDefinition().capabilities, routingKinds: ['straight', 'orthogonal'] },
      }),
    ],
    [
      'radius without orthogonal capability',
      validDefinition({
        defaults: { ...validDefinition().defaults, routing: { kind: 'straight', orthogonalCornerRadius: 4 } },
      }),
    ],
  ])('rejects %s during the shared registry validation path', (_label, definition) => {
    try {
      resolveFlowLayoutRegistry({ flowLayouts: [definition] });
      expect.unreachable('Expected invalid Flow Layout Definition');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;
      expect(error.code).toBe(RetikzDiagramErrorCode.DefinitionInvalid);
      expect(error.details).toMatchObject({ capability: 'flow-layout', key: definition.name });
    }
  });
});
