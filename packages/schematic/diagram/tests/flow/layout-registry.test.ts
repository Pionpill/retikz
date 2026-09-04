import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { FlowLayoutDefinition } from '../../src/flow';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../src/errors';
import { defineFlowLayout, FlowDiagramSchema, getFlowLayoutCatalog } from '../../src/flow';
import { resolveFlowLayoutRegistry, resolveFlowThemeStyleRegistry } from '../../src/flow/providers';
import { assertFlowLayoutCapabilities, deriveFlowLayoutCapabilities, resolveFlowDiagram } from '../../src/flow/resolve';
import { parseTestFlowDiagram } from './fixtures';

const customDefinition = (name = 'custom'): FlowLayoutDefinition =>
  defineFlowLayout({
    name,
    description: 'Custom straight-only Flow layout.',
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
    defaults: { direction: 'down', nodeGap: 10, rankGap: 20, routing: { kind: 'straight' } },
    layout: () => ({ elements: [], relations: [] }),
  });

describe('Flow Layout registry and catalog', () => {
  it('keeps built-ins first, deduplicates identity and selects one explicit runtime default', () => {
    const custom = customDefinition();
    const resolved = resolveFlowLayoutRegistry({
      flowLayouts: [custom, custom],
      defaultFlowLayout: 'custom',
    });

    expect([...resolved.layouts.keys()]).toEqual(['layered', 'custom']);
    expect(resolved.defaultLayout).toBe(custom);
  });

  it('rejects same-name different identities and unknown defaults without last-wins fallback', () => {
    const custom = customDefinition();
    for (const [run, code] of [
      [
        () => resolveFlowLayoutRegistry({ flowLayouts: [custom, customDefinition()] }),
        RetikzDiagramErrorCode.DefinitionDuplicate,
      ],
      [
        () => resolveFlowLayoutRegistry({ flowLayouts: [custom], defaultFlowLayout: 'missing' }),
        RetikzDiagramErrorCode.DefinitionNotRegistered,
      ],
    ] as const) {
      try {
        run();
        expect.unreachable('Expected Flow Layout registry failure');
      } catch (error) {
        if (!(error instanceof RetikzDiagramError)) throw error;
        expect(error.code).toBe(code);
        expect(error.details).toMatchObject({ capability: 'flow-layout' });
      }
    }
  });

  it('projects a JSON-safe catalog from the dispatch registry with exactly one default', () => {
    const catalog = getFlowLayoutCatalog({ flowLayouts: [customDefinition()], defaultFlowLayout: 'custom' });

    expect(catalog.map(entry => entry.name)).toEqual(['layered', 'custom']);
    expect(catalog.filter(entry => entry.isDefault).map(entry => entry.name)).toEqual(['custom']);
    expect(JSON.parse(JSON.stringify(catalog))).toEqual(catalog);
    expect(catalog.every(entry => !('layout' in entry))).toBe(true);
  });

  it('publishes straight as the built-in layered routing default while retaining orthogonal support defaults', () => {
    const layered = getFlowLayoutCatalog().find(entry => entry.name === 'layered');

    expect(layered?.defaults).toEqual({
      direction: 'right',
      nodeGap: 24,
      rankGap: 48,
      routing: { kind: 'straight', orthogonalCornerRadius: 8 },
    });
  });
});

describe('Flow Layout capability preflight', () => {
  it('requires compound scope support but never group endpoint support for a Layout', () => {
    const source = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'entity', text: 'Entity' }],
      groups: [],
      layouts: [{ id: 'layout', direction: 'right', children: ['entity'] }],
      children: ['layout'],
    });
    const canonical = resolveFlowDiagram(source, {
      theme: DEFAULT_RESOLVED_THEME,
      flowThemeStyles: resolveFlowThemeStyleRegistry(),
    });

    expect(deriveFlowLayoutCapabilities(customDefinition(), canonical).map(item => item.name)).toEqual([
      'compoundScopes',
    ]);
  });

  it('derives compound, endpoint, cross-Group, cycle, self-loop, parallel, label, direction and routing needs', () => {
    const source = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      flowTheme: { layout: { routing: { kind: 'orthogonal', cornerRadius: 4 } } },
      entities: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      groups: [
        { id: 'left', children: ['a'] },
        { id: 'right', children: ['b'] },
      ],
      layouts: [],
      children: ['left', 'right'],
      relations: [
        { source: 'left', target: 'right' },
        { source: 'a', target: 'b', label: 'cross' },
        { source: 'a', target: 'b' },
        { source: 'b', target: 'a' },
        { source: 'a', target: 'a' },
        { source: 'a', target: 'b', direction: 'both' },
      ],
    });
    const canonical = resolveFlowDiagram(source, {
      theme: DEFAULT_RESOLVED_THEME,
      flowThemeStyles: resolveFlowThemeStyleRegistry(),
    });

    try {
      assertFlowLayoutCapabilities(customDefinition(), canonical);
      expect.unreachable('Expected unsupported capability failure');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;
      expect(error.code).toBe(RetikzDiagramErrorCode.FlowLayoutCapabilityUnsupported);
      expect(error.details).toMatchObject({
        definition: 'custom',
        missingCapabilities: expect.arrayContaining([
          'compoundScopes',
          'groupEndpoints',
          'crossScopeRelations',
          'cycles',
          'selfLoops',
          'parallelRelations',
          'relationLabels',
          'direction:both',
          'routing:orthogonal',
        ]),
      });
    }
  });
});
