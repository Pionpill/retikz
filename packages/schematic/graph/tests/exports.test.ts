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

  it('exposes exactly the three Graph semantic elements without compatibility aliases', () => {
    expect(graphExports.GRAPH_NAMESPACE).toBe('graph');
    expect(graphExports.ContainerDefinition).toBeDefined();
    expect(graphExports.EntityDefinition).toBeDefined();
    expect(graphExports.RelationDefinition).toBeDefined();
    expect(graphExports.EntitySchema).toBeDefined();
    expect(graphExports.GraphType).toEqual({
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

  it('exposes EntityVariant and RelationRole as closed public vocabularies', () => {
    expect(graphExports.EntityVariant).toEqual({
      Default: 'default',
      Primary: 'primary',
      Secondary: 'secondary',
      Outline: 'outline',
      Vibrant: 'vibrant',
    });
    expect(graphExports.RelationRole).toEqual({
      Flow: 'flow',
      Branch: 'branch',
      Dependency: 'dependency',
      Feedback: 'feedback',
    });
    expect(graphExports).not.toHaveProperty('GraphThemeStyle');
    expect(graphExports).not.toHaveProperty('defineGraphThemeStyle');
  });

  it('keeps implementation shapes private and rejects the old namespace', () => {
    expect('NonBlankStringSchema' in graphExports).toBe(false);
    expect(graphExports.ContainerSpacingSchema).toBeDefined();
    expect(graphExports.ContainerNeutralStyleSchema).toBeDefined();
    expect(() =>
      graphExports.EntitySchema.parse({ namespace: 'notation', type: 'entity', id: 'legacy', role: 'stage' }),
    ).toThrow();
  });
});
