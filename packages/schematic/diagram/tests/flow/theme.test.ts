import type { ResolvedTheme } from '@retikz/core';
import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../src/errors';
import type { FlowThemeDefinition } from '../../src/flow';
import { defineFlowTheme } from '../../src/flow';
import { resolveFlowThemeRegistry } from '../../src/flow/providers';
import { resolveFlowDiagram } from '../../src/flow/resolve';
import { parseTestFlowDiagram } from './fixtures';

const themeWith = (overrides: Partial<ResolvedTheme>): ResolvedTheme => ({
  ...DEFAULT_RESOLVED_THEME,
  ...overrides,
});

const registryOf = (...definitions: ReadonlyArray<FlowThemeDefinition>): ReadonlyMap<string, FlowThemeDefinition> =>
  resolveFlowThemeRegistry(definitions);

describe('Flow Theme Definition and registry', () => {
  it('keeps the exact Definition object as a typed identity', () => {
    const definition = {
      name: 'brand',
      resolve: () => ({ entity: { style: { opacity: 0.8 } } }),
    } satisfies FlowThemeDefinition;

    expect(defineFlowTheme(definition)).toBe(definition);
  });

  it('deduplicates the same identity and rejects blank or conflicting names', () => {
    const brand = defineFlowTheme({
      name: 'brand',
      resolve: () => ({ entity: { style: { opacity: 0.8 } } }),
    });

    expect([...resolveFlowThemeRegistry([brand, brand]).keys()]).toEqual(['brand']);

    for (const run of [
      () => resolveFlowThemeRegistry([{ name: ' ', resolve: () => ({}) }]),
      () => resolveFlowThemeRegistry([brand, { ...brand }]),
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
        theme: themeWith({ name: 'missing' }),
        flowThemeDefinitions: registryOf(),
      });

      expect.unreachable('Expected missing Flow Theme failure');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;

      expect(error.code).toBe(RetikzDiagramErrorCode.DefinitionNotRegistered);
      expect(error.details).toMatchObject({
        capability: 'flow-theme',
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
    ['removed tokens wrapper', () => ({ entity: {}, tokens: {} })],
    ['structural field', () => ({ entity: { style: { opacity: 1, shape: 'circle' } } })],
  ])('wraps invalid %s output with the Definition as cause', (_label, resolve) => {
    const source = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'entity', text: 'Entity' }],
      groups: [],
      layouts: [],
      children: ['entity'],
    });
    const definition = defineFlowTheme({ name: 'invalid', resolve });

    try {
      resolveFlowDiagram(source, {
        theme: themeWith({ name: 'invalid' }),
        flowThemeDefinitions: registryOf(definition),
      });

      expect.unreachable('Expected invalid Flow Theme callback output');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;

      expect(error.code).toBe(RetikzDiagramErrorCode.DefinitionCallbackFailed);
      expect(error.details).toMatchObject({ capability: 'flow-theme', key: 'invalid' });
      expect(error.cause).toBeDefined();
    }
  });
});

describe('Flow Theme cascade', () => {
  it('applies named defaults, author defaults, Group layout and item overrides in order', () => {
    const brand = defineFlowTheme({
      name: 'brand',
      resolve: () => ({
        layout: { nodeGap: 8 },
        entity: { style: { opacity: 0.4, dashed: true, fill: '#fef3c7', font: { family: 'Inter', size: 12 } } },
      }),
    });
    const source = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      defaultFlow: {
        layout: { nodeGap: 12, rankGap: 24 },
        entity: { style: { fill: 'transparent', opacity: 0.7, font: { size: 16 } }, layout: { margin: 2 } },
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
      theme: themeWith({ name: 'brand' }),
      flowThemeDefinitions: registryOf(brand),
    });
    const group = resolved.elements[0];
    if (group.type !== 'group') throw new Error('Expected Group');

    const entity = group.elements[0];
    if (entity.type !== 'entity') throw new Error('Expected Entity');

    expect(resolved.layout).toMatchObject({ nodeGap: 12, rankGap: 24 });
    expect(group.layout).toEqual({ nodeGap: 20 });
    expect(entity.style).toMatchObject({
      opacity: { overall: 0 },
      dashed: false,
      fill: 'transparent',
      font: { weight: 700 },
    });
    expect(entity.layout).toMatchObject({ margin: 0 });
  });
});
