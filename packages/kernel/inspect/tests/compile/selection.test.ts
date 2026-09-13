import type { CompileObservation, IRScene } from '@retikz/core';

import { describe, expect, it } from 'vitest';
import { null as zodNull, number, strictObject, string } from 'zod';

import { createInspectorRegistry, defineInspector, RetikzInspectError } from '../../src';
import { resolveInspectionSelection } from '../../src/compile';

const owner = { kind: 'composite' as const, namespace: 'demo', type: 'box' };
const key = { namespace: 'test', type: 'box' };
const definition = defineInspector({
  ...key,
  owner,
  subjectSchema: strictObject({ value: number() }),
  optionsSchema: strictObject({ label: string().default('default'), tone: string().default('normal') }),
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
  ancestors: [],
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
  it('uses schema defaults and transformed output without a resolver on direct registration', () => {
    const rawDefinition = {
      ...key,
      owner,
      subjectSchema: definition.subjectSchema,
      optionsSchema: strictObject({ count: string().default('2').transform(Number) }),
      inspect: () => [],
    };
    for (const [options, count] of [
      [true, 2],
      [{ count: '5' }, 5],
    ] as const) {
      const requests = resolveInspectionSelection({
        ir,
        registry: createInspectorRegistry([rawDefinition]),
        observations: [observation(0)],
        selection: { rules: [{ kind: 'request', inspector: key, target: { kind: 'scene' }, options }] },
      });
      expect(requests[0]?.options).toEqual({ count });
    }
  });

  it('passes parsed output to a custom resolver with a different consumer shape', () => {
    const inspector = defineInspector({
      ...key,
      owner,
      subjectSchema: definition.subjectSchema,
      optionsSchema: strictObject({ count: string().default('2').transform(Number) }),
      resolveOptions: options => ({ label: options.count.toFixed(1) }),
      inspect: (_subject, context) => ({ type: 'node', position: [0, 0], content: context.options.label }),
    });
    const requests = resolveInspectionSelection({
      ir,
      registry: createInspectorRegistry([inspector]),
      observations: [observation(0)],
      selection: { rules: [{ kind: 'request', inspector: key, target: { kind: 'scene' }, options: true }] },
    });
    expect(requests[0]?.options).toEqual({ label: '2.0' });
  });

  it('isolates merge callback mutations from authored options and later occurrences', () => {
    const sourceOptions = { label: 'parent' };
    const mutating = defineInspector({
      ...definition,
      mergeOptionsInput: inherited => {
        inherited.label = `${inherited.label ?? ''}!`;
        return inherited;
      },
    });
    const resolved = resolveInspectionSelection({
      ir,
      registry: createInspectorRegistry([mutating]),
      observations: [observation(0), observation(1)],
      selection: {
        rules: [
          { kind: 'request', inspector: key, target: { kind: 'scene' }, options: sourceOptions },
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'subtree', sourcePath: 'children[0].scope' },
            options: {},
          },
        ],
      },
    });
    expect(resolved.map(request => request.options.label)).toEqual(['parent!', 'parent!']);
    expect(sourceOptions).toEqual({ label: 'parent' });
  });
  it('merges three authored layers before transforming effective options', () => {
    const transformed = defineInspector({
      ...key,
      owner,
      subjectSchema: definition.subjectSchema,
      inspect: () => [],
      optionsSchema: strictObject({
        label: string()
          .transform(label => `${label}!`)
          .default('default'),
      }),
      mergeOptionsInput: (inherited, local) => ({ ...inherited, ...local }),
    });
    const resolved = resolveInspectionSelection({
      ir,
      registry: createInspectorRegistry([transformed]),
      observations: [observation(0)],
      selection: {
        rules: [
          { kind: 'request', inspector: key, target: { kind: 'scene' }, options: { label: 'once' } },
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'subtree', sourcePath: 'children[0].scope' },
            options: {},
          },
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope.children[0]' } },
            options: {},
          },
        ],
      },
    });
    expect(resolved[0]?.options).toEqual({ label: 'once!' });
  });

  it.each([true, false])('rejects invalid source rules even when unmatched or overridden: %s', matched => {
    expect(() =>
      resolveInspectionSelection({
        ir,
        registry,
        observations: matched ? [observation(0)] : [],
        selection: {
          rules: [
            { kind: 'request', inspector: key, target: { kind: 'scene' }, options: { label: 42 } },
            {
              kind: 'request',
              inspector: key,
              target: { kind: 'subtree', sourcePath: 'children[0].scope' },
              options: { label: 'valid' },
            },
          ],
        },
      }),
    ).toThrow();
  });
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
      owner: { kind: 'path' as const, name: 'stroke' },
      subjectSchema: zodNull(),
      optionsSchema: strictObject({}),
      resolveOptions: options => options,
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
      owner: { kind: 'path', name: 'stroke' },
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

  it('supports both scene and self selection for third-party Path Inspectors', () => {
    const pathKey = { namespace: 'third-party', type: 'path-geometry' };
    const pathDefinition = defineInspector({
      ...pathKey,
      owner: { kind: 'path' as const, name: 'stroke' },
      subjectSchema: strictObject({ value: number() }),
      optionsSchema: strictObject({}),
      resolveOptions: options => options,
      inspect: () => [],
    });
    const pathRegistry = createInspectorRegistry([pathDefinition]);
    const pathIr: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'path', children: [{ type: 'step', kind: 'move', to: [0, 0] }] }],
    };
    const pathObservation: CompileObservation = {
      owner: { kind: 'path', name: 'stroke' },
      occurrence: { sourcePath: 'children[0].path', expansionPath: [] },
      provenance: {
        origin: { sourcePath: 'children[0].path', expansionPath: [] },
        final: { sourcePath: 'children[0].path', expansionPath: [] },
      },
      transform: [1, 0, 0, 1, 0, 0],
      ancestors: [],
      value: { value: 1 },
    };

    expect(
      resolveInspectionSelection({
        ir: pathIr,
        registry: pathRegistry,
        observations: [pathObservation],
        selection: { rules: [{ kind: 'request', inspector: pathKey, target: { kind: 'scene' }, options: true }] },
      }),
    ).toHaveLength(1);
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

  it('does not let an authored Scope self locator select a Clip application at the same source path', () => {
    const clipKey = { namespace: 'test', type: 'clip' };
    const clipDefinition = defineInspector({
      ...clipKey,
      owner: { kind: 'clip' as const },
      subjectSchema: strictObject({ value: number() }),
      optionsSchema: strictObject({}),
      resolveOptions: options => options,
      inspect: () => [],
    });
    const clipObservation: CompileObservation = {
      owner: { kind: 'clip' },
      occurrence: { sourcePath: 'children[0].scope', expansionPath: [{ kind: 'clip', index: 0 }] },
      provenance: {
        origin: { sourcePath: 'children[0].scope', expansionPath: [] },
        final: { sourcePath: 'children[0].scope', expansionPath: [{ kind: 'clip', index: 0 }] },
      },
      ancestors: [],
      transform: [1, 0, 0, 1, 0, 0],
      value: { value: 1 },
    };
    const clipIr: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'scope', clip: { kind: 'rect', x: 0, y: 0, width: 10, height: 10 }, children: [] }],
    };

    try {
      resolveInspectionSelection({
        ir: clipIr,
        registry: createInspectorRegistry([clipDefinition]),
        observations: [clipObservation],
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: clipKey,
              target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope' } },
              options: true,
            },
          ],
        },
      });
      throw new Error('expected authored Scope self selection to reject Clip output');
    } catch (error) {
      expect(error).toBeInstanceOf(RetikzInspectError);
      expect((error as RetikzInspectError).details.origin).toMatchObject({ stage: 'selection' });
    }
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
