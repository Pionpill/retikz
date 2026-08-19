import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import * as graphExports from '../src';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  name: string;
  version: string;
  retikz: { domain: string; releaseGroup: string };
  exports: Record<string, unknown>;
  publishConfig: { exports: Record<string, unknown> };
};

describe('@retikz/graph package boundary', () => {
  it('declares the Diagram Graph release metadata and one root export', () => {
    expect(manifest).toMatchObject({
      name: '@retikz/graph',
      version: '0.1.0-alpha.1',
      retikz: { domain: 'schematic', releaseGroup: 'graph' },
    });
    expect(Object.keys(manifest.exports)).toEqual(['.']);
    expect(Object.keys(manifest.publishConfig.exports)).toEqual(['.']);
  });

  it('exposes the Graph presentation root and three semantic elements without compatibility aliases', () => {
    expect(graphExports.GRAPH_NAMESPACE).toBe('graph');
    expect(graphExports.ContainerDefinition).toBeDefined();
    expect(graphExports.EntityDefinition).toBeDefined();
    expect(graphExports.GraphDefinition).toBeDefined();
    expect(graphExports.GraphProviderKey).toEqual({
      capability: 'composite',
      namespace: 'graph',
      type: 'graph',
    });
    expect(graphExports.RelationDefinition).toBeDefined();
    expect(graphExports.EntitySchema).toBeDefined();
    expect(graphExports.GraphSchema).toBeDefined();
    expect(graphExports.createGraph).toBeTypeOf('function');
    expect(graphExports.createGraphDefinitions).toBeTypeOf('function');
    expect(graphExports.createGraphProviders).toBeTypeOf('function');
    expect(graphExports.RetikzGraphError).toBeDefined();
    expect(graphExports.RetikzGraphErrorCode.DefinitionDuplicate).toBe('GRAPH_DEFINITION_DUPLICATE');
    expect(graphExports.GraphType).toEqual({
      Graph: 'graph',
      Container: 'container',
      Entity: 'entity',
      Relation: 'relation',
    });
    expect(graphExports).not.toHaveProperty('TerminalSchema');
    expect(graphExports).not.toHaveProperty('StageSchema');
    expect(graphExports).not.toHaveProperty('DecisionSchema');
    expect(graphExports).not.toHaveProperty('JunctionSchema');
    expect(graphExports).not.toHaveProperty('LogicFrameDefinition');
  });

  it('exposes builtin role and variant vocabularies alongside their extension hooks', () => {
    expect(graphExports.EntityVariant).toEqual({
      Default: 'default',
      Fill: 'fill',
      Mixed: 'mixed',
    });
    expect(graphExports.RelationRole).toEqual({
      Flow: 'flow',
      Branch: 'branch',
      Dependency: 'dependency',
      Feedback: 'feedback',
    });
    expect(graphExports).not.toHaveProperty('GraphThemeStyle');
    expect(graphExports.defineEntityRole).toBeTypeOf('function');
    expect(graphExports.defineEntityVariant).toBeTypeOf('function');
    expect(graphExports.defineGraphThemeStyle).toBeTypeOf('function');
  });

  it('keeps implementation shapes private and rejects a foreign namespace', () => {
    expect('NonBlankStringSchema' in graphExports).toBe(false);
    expect(graphExports.ContainerSpacingSchema).toBeDefined();
    expect(graphExports.ContainerNeutralStyleSchema).toBeDefined();
    expect(() =>
      graphExports.EntitySchema.parse({ namespace: 'foreign', type: 'entity', id: 'invalid', role: 'stage' }),
    ).toThrow();
  });
});
