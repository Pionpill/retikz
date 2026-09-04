import type { ResolvedTheme } from '@retikz/core';

import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { FlowThemeStyleDefinition } from '../../src/flow';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../src/errors';
import { defineFlowThemeStyle } from '../../src/flow';
import { resolveFlowThemeStyleRegistry } from '../../src/flow/providers';
import { resolveFlowDiagram } from '../../src/flow/resolve';
import { parseTestFlowDiagram } from './fixtures';

const themeWith = (overrides: Partial<ResolvedTheme>): ResolvedTheme => ({
  ...DEFAULT_RESOLVED_THEME,
  ...overrides,
});

const registryOf = (
  ...definitions: ReadonlyArray<FlowThemeStyleDefinition>
): ReadonlyMap<string, FlowThemeStyleDefinition> => resolveFlowThemeStyleRegistry(definitions);

describe('Flow Theme Definition and registry', () => {
  it('keeps the exact Definition object as a typed identity', () => {
    const definition = {
      name: 'brand',
      resolve: () => ({ tokens: { 'flow.entity.opacity': 0.8 } }),
    } satisfies FlowThemeStyleDefinition;

    expect(defineFlowThemeStyle(definition)).toBe(definition);
  });

  it('deduplicates the same identity and rejects blank or conflicting names', () => {
    const brand = defineFlowThemeStyle({
      name: 'brand',
      resolve: () => ({ tokens: { 'flow.entity.opacity': 0.8 } }),
    });

    expect([...resolveFlowThemeStyleRegistry([brand, brand]).keys()]).toEqual(['brand']);

    for (const run of [
      () => resolveFlowThemeStyleRegistry([{ name: ' ', resolve: () => ({}) }]),
      () => resolveFlowThemeStyleRegistry([brand, { ...brand }]),
    ]) {
      expect(run).toThrowError(RetikzDiagramError);
    }
  });

  it('fails loudly when the Core style lacks a same-named Flow Definition', () => {
    const source = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'entity', text: 'Entity' }],
      groups: [],
      layouts: [],
      children: ['entity'],
    });

    try {
      resolveFlowDiagram(source, {
        theme: themeWith({ style: 'missing' }),
        flowThemeStyles: registryOf(),
      });
      expect.unreachable('Expected missing Flow Theme style failure');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;
      expect(error.code).toBe(RetikzDiagramErrorCode.DefinitionNotRegistered);
      expect(error.details).toMatchObject({
        capability: 'flow-theme-style',
        key: 'missing',
        availableKeys: [],
      });
    }
  });

  it.each([
    [
      'callback error',
      () => {
        throw new Error('external callback failed');
      },
    ],
    ['empty tokens', () => ({ tokens: {} })],
    ['unknown token', () => ({ tokens: { 'flow.entity.shape': 'circle' } })],
  ])('wraps invalid %s output with the Definition as cause', (_label, resolve) => {
    const source = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'entity', text: 'Entity' }],
      groups: [],
      layouts: [],
      children: ['entity'],
    });
    const definition = defineFlowThemeStyle({ name: 'invalid', resolve });

    try {
      resolveFlowDiagram(source, {
        theme: themeWith({ style: 'invalid' }),
        flowThemeStyles: registryOf(definition),
      });
      expect.unreachable('Expected invalid Flow Theme callback output');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;
      expect(error.code).toBe(RetikzDiagramErrorCode.DefinitionCallbackFailed);
      expect(error.details).toMatchObject({ capability: 'flow-theme-style', key: 'invalid' });
      expect(error.cause).toBeDefined();
    }
  });
});

describe('Flow Theme cascade', () => {
  it('applies named tokens, Source tokens, global config, Group layout and item overrides in order', () => {
    const brand = defineFlowThemeStyle({
      name: 'brand',
      resolve: () => ({
        tokens: {
          'flow.layout.nodeGap': 8,
          'flow.entity.opacity': 0.4,
          'flow.entity.dashed': true,
          'flow.entity.fill': '#fef3c7',
          'flow.entity.font': { family: 'Inter', size: 12 },
        },
      }),
    });
    const source = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      flowThemeTokens: {
        'flow.layout.nodeGap': 0,
        'flow.entity.opacity': 0,
        'flow.entity.dashed': false,
        'flow.entity.fill': 'transparent',
        'flow.entity.font': { weight: 600 },
      },
      flowTheme: {
        layout: { nodeGap: 12, rankGap: 24 },
        entity: { style: { opacity: 0.7, font: { size: 16 } }, layout: { margin: 2 } },
      },
      entities: [
        {
          id: 'entity',
          text: 'Entity',
          style: { opacity: 0, dashed: false, font: { weight: 700 } },
          layout: { margin: 0 },
        },
      ],
      groups: [{ id: 'group', layout: { nodeGap: 20 }, children: ['entity'] }],
      layouts: [],
      children: ['group'],
    });

    const resolved = resolveFlowDiagram(source, {
      theme: themeWith({ style: 'brand' }),
      flowThemeStyles: registryOf(brand),
    });
    const group = resolved.elements[0];
    if (group.type !== 'group') throw new Error('Expected Group');
    const entity = group.elements[0];
    if (entity.type !== 'entity') throw new Error('Expected Entity');

    expect(resolved.layout).toMatchObject({ nodeGap: 12, rankGap: 24 });
    expect(group.layout).toMatchObject({ nodeGap: 20, rankGap: 24 });
    expect(entity.style).toMatchObject({
      opacity: 0,
      dashed: false,
      fill: 'transparent',
      font: { family: 'Inter', size: 16, weight: 700 },
    });
    expect(entity.layout).toMatchObject({ margin: 0 });
  });
});
