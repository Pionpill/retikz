import type { CompileObservation, IRScene } from '@retikz/core';

import { describe, expect, it } from 'vitest';
import { null as zodNull, number, strictObject, string } from 'zod';

import { createInspectorRegistry, defineInspector, resolveInspectionSelection } from '../../src';

const owner = { kind: 'composite' as const, namespace: 'demo', type: 'box' };
const key = { namespace: 'test', type: 'box' };
const definition = defineInspector({
  ...key,
  owner,
  subjectSchema: strictObject({ value: number() }),
  optionsInputSchema: strictObject({ label: string().optional(), tone: string().optional() }),
  optionsSchema: strictObject({ label: string().optional(), tone: string().optional() }).transform(value => ({
    label: value.label ?? 'default',
    tone: value.tone ?? 'normal',
  })),
  mergeOptionsInput: (inherited, local) => ({ ...inherited, ...local }),
  inspect: () => [],
});
const registry = createInspectorRegistry([definition]);
const ir: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'scope',
      children: [
        { namespace: 'demo', type: 'box' },
        { namespace: 'demo', type: 'box' },
      ],
    },
  ],
};
const observation = (index: number): CompileObservation => ({
  owner,
  occurrence: { sourcePath: `children[0].scope.children[${index}]`, expansionPath: [] },
  provenance: {
    origin: { sourcePath: `children[0].scope.children[${index}]`, expansionPath: [] },
    final: { sourcePath: `children[0].scope.children[${index}]`, expansionPath: [] },
  },
  transform: [1, 0, 0, 1, 0, 0],
  value: { value: index },
});

const colocatedObservation = (index: number): CompileObservation => ({
  ...observation(0),
  occurrence: {
    sourcePath: 'children[0].scope.children[0]',
    expansionPath: index === 0 ? [] : [{ kind: 'replay', index: index - 1 }],
  },
  provenance: {
    origin: {
      sourcePath: 'children[0].scope.children[0]',
      expansionPath: index === 0 ? [] : [{ kind: 'probe', index: index - 1 }],
    },
    final: {
      sourcePath: 'children[0].scope.children[0]',
      expansionPath: index === 0 ? [] : [{ kind: 'replay', index: index - 1 }],
    },
  },
  value: { value: index },
});

describe('Inspection selection', () => {
  it('evaluates scene, outer subtree, inner self and allocates appearance after stable sorting', () => {
    const resolved = resolveInspectionSelection({
      ir,
      registry,
      observations: [observation(1), observation(0)],
      selection: {
        rules: [
          { kind: 'request', inspector: key, target: { kind: 'scene' }, options: { tone: 'scene' } },
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'subtree', sourcePath: 'children[0].scope' },
            options: { label: 'nested' },
          },
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope.children[1]' } },
            options: false,
          },
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'self', locator: { kind: 'occurrence', occurrence: observation(1).occurrence } },
            options: { tone: 'reopened' },
          },
        ],
      },
    });

    expect(resolved.map(request => request.occurrence.sourcePath)).toEqual([
      'children[0].scope.children[0]',
      'children[0].scope.children[1]',
    ]);
    expect(resolved.map(request => request.options)).toEqual([
      { label: 'nested', tone: 'scene' },
      { label: 'default', tone: 'reopened' },
    ]);
    expect(resolved.map(request => request.colorScope)).toEqual([0, 1]);
  });

  it('prevents reopening below a barrier', () => {
    const resolved = resolveInspectionSelection({
      ir,
      registry,
      observations: [observation(0)],
      selection: {
        rules: [
          { kind: 'request', inspector: key, target: { kind: 'scene' }, options: true },
          { kind: 'barrier', target: { kind: 'subtree', sourcePath: 'children[0].scope' } },
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope.children[0]' } },
            options: true,
          },
        ],
      },
    });
    expect(resolved).toEqual([]);
  });

  it('allows a false-only self rule without requesting an owner output', () => {
    expect(
      resolveInspectionSelection({
        ir,
        registry,
        observations: [],
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: key,
              target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope.children[0]' } },
              options: false,
            },
          ],
        },
      }),
    ).toEqual([]);
  });

  it('fails an explicit self owner mismatch but permits scene rules with no matching owner', () => {
    const pathDefinition = defineInspector({
      ...key,
      owner: { kind: 'pathKind' as const, name: 'stroke' },
      subjectSchema: zodNull(),
      optionsInputSchema: strictObject({}),
      optionsSchema: strictObject({}),
      inspect: () => [],
    });
    const pathRegistry = createInspectorRegistry([pathDefinition]);
    expect(() =>
      resolveInspectionSelection({
        ir,
        registry: pathRegistry,
        observations: [observation(0)],
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: key,
              target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope.children[0]' } },
              options: true,
            },
          ],
        },
      }),
    ).toThrow(/owner/i);
    expect(
      resolveInspectionSelection({
        ir,
        registry: pathRegistry,
        observations: [observation(0)],
        selection: { rules: [{ kind: 'request', inspector: key, target: { kind: 'scene' }, options: true }] },
      }),
    ).toEqual([]);
  });

  it('selects the matching owner when one authored source publishes multiple owner outputs', () => {
    const colocatedPath: CompileObservation = {
      ...observation(0),
      owner: { kind: 'pathKind', name: 'stroke' },
    };

    const resolved = resolveInspectionSelection({
      ir,
      registry,
      observations: [colocatedPath, observation(0)],
      selection: {
        rules: [
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope.children[0]' } },
            options: true,
          },
        ],
      },
    });

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.owner).toEqual(owner);
  });

  it('按 occurrenceIndex 区分同 source path 与 owner 的嵌套 occurrence', () => {
    const resolved = resolveInspectionSelection({
      ir,
      registry,
      observations: [colocatedObservation(1), colocatedObservation(0)],
      selection: {
        rules: [
          {
            kind: 'request',
            inspector: key,
            target: {
              kind: 'self',
              locator: {
                kind: 'authored',
                sourcePath: 'children[0].scope.children[0]',
                occurrenceIndex: 1,
              },
            },
            options: true,
          },
        ],
      },
    });

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.occurrence.expansionPath).toEqual([{ kind: 'replay', index: 0 }]);
  });

  it('rejects an authored occurrenceIndex outside the final owner occurrences', () => {
    expect(() =>
      resolveInspectionSelection({
        ir,
        registry,
        observations: [colocatedObservation(0), colocatedObservation(1)],
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: key,
              target: {
                kind: 'self',
                locator: {
                  kind: 'authored',
                  sourcePath: 'children[0].scope.children[0]',
                  occurrenceIndex: 2,
                },
              },
              options: true,
            },
          ],
        },
      }),
    ).toThrow(/final owner output/i);
  });

  it('requires explicit self selection for every Path Inspector, including third-party definitions', () => {
    const pathKey = { namespace: 'third-party', type: 'path-geometry' };
    const pathDefinition = defineInspector({
      ...pathKey,
      owner: { kind: 'pathKind' as const, name: 'stroke' },
      subjectSchema: strictObject({ value: number() }),
      optionsInputSchema: strictObject({}),
      optionsSchema: strictObject({}),
      inspect: () => [],
    });
    const pathRegistry = createInspectorRegistry([pathDefinition]);
    const pathIr: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'path', children: [{ type: 'step', kind: 'move', to: [0, 0] }] }],
    };
    const pathObservation: CompileObservation = {
      owner: { kind: 'pathKind', name: 'stroke' },
      occurrence: { sourcePath: 'children[0].path', expansionPath: [] },
      provenance: {
        origin: { sourcePath: 'children[0].path', expansionPath: [] },
        final: { sourcePath: 'children[0].path', expansionPath: [] },
      },
      transform: [1, 0, 0, 1, 0, 0],
      value: { value: 1 },
    };

    expect(
      resolveInspectionSelection({
        ir: pathIr,
        registry: pathRegistry,
        observations: [pathObservation],
        selection: { rules: [{ kind: 'request', inspector: pathKey, target: { kind: 'scene' }, options: true }] },
      }),
    ).toEqual([]);
    expect(
      resolveInspectionSelection({
        ir: pathIr,
        registry: pathRegistry,
        observations: [pathObservation],
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: pathKey,
              target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].path' } },
              options: true,
            },
          ],
        },
      }),
    ).toHaveLength(1);
  });

  it.each([
    [
      'duplicate target and key',
      {
        rules: [
          { kind: 'request', inspector: key, target: { kind: 'scene' }, options: true },
          { kind: 'request', inspector: key, target: { kind: 'scene' }, options: false },
        ],
      },
    ],
    [
      'invalid source locator',
      {
        rules: [
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'subtree', sourcePath: 'children[99].scope' },
            options: true,
          },
        ],
      },
    ],
    [
      'invalid authored occurrence index',
      {
        rules: [
          {
            kind: 'request',
            inspector: key,
            target: {
              kind: 'self',
              locator: {
                kind: 'authored',
                sourcePath: 'children[0].scope.children[0]',
                occurrenceIndex: -1,
              },
            },
            options: true,
          },
        ],
      },
    ],
    [
      'invalid occurrence locator index',
      {
        rules: [
          {
            kind: 'request',
            inspector: key,
            target: {
              kind: 'self',
              locator: {
                kind: 'occurrence',
                occurrence: {
                  sourcePath: 'children[0].scope.children[0]',
                  expansionPath: [{ kind: 'replay', index: -1 }],
                },
              },
            },
            options: true,
          },
        ],
      },
    ],
  ] as const)('fails admission for %s before resolving callbacks', (_label, selection) => {
    expect(() =>
      resolveInspectionSelection({
        ir,
        registry,
        observations: [observation(0)],
        selection,
      }),
    ).toThrow();
  });
});
