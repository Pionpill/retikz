import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type {
  AnyCompositeDefinition,
  AnyCoreProviderDefinition,
  CoreDependencyProvider,
  CoreProviderContribution,
  CoreProviderKey,
} from '../../../src';

import { defineArrow, defineClip, defineComposite, defineShape, resolveCoreProviderDependencies } from '../../../src';

const shapeKey = (name: string): CoreProviderKey => ({ capability: 'shape', name });
const arrowKey = (name: string): CoreProviderKey => ({ capability: 'arrow', name });
const clipKey = (name: string): CoreProviderKey => ({ capability: 'clip', name });
const compositeKey = (namespace: string, type: string): CoreProviderKey => ({
  capability: 'composite',
  namespace,
  type,
});

const shapeDefinitionOf = (name: string) =>
  defineShape({
    name,
    paramsSchema: z.strictObject({}),
    circumscribe: (halfWidth, halfHeight) => ({ halfWidth, halfHeight }),
    boundaryPoint: (_rect, toward) => toward,
    emit: () => [],
    anchor: () => undefined,
  });

const compositeDefinitionOf = (namespace: string, type: string): AnyCompositeDefinition =>
  defineComposite({
    namespace,
    type,
    schema: z.strictObject({ namespace: z.literal(namespace), type: z.literal(type) }),
    expand: () => ({ children: [] }),
  });

const arrowDefinitionOf = (name: string) =>
  defineArrow({
    name,
    lineContactX: 0,
    emit: () => [],
  });

const clipDefinitionOf = (name: string) =>
  defineClip({
    kind: name,
    schema: z.strictObject({ kind: z.literal(name) }),
    resolve: () => ({ kind: name, size: 4 }),
    shapeSchema: z.strictObject({ kind: z.literal(name), size: z.number().positive() }),
    lower: shape => ({
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [shape.size, shape.size] },
      ],
      fillRule: 'nonzero',
    }),
  });

const definitionOf = (key: CoreProviderKey): AnyCoreProviderDefinition => {
  if (key.capability === 'composite') return compositeDefinitionOf(key.namespace, key.type);
  if (key.capability === 'shape') return shapeDefinitionOf(key.name);
  if (key.capability === 'arrow') return arrowDefinitionOf(key.name);
  if (key.capability === 'clip') return clipDefinitionOf(key.name);
  throw new Error(`unsupported test capability ${key.capability}`);
};

const providerOf = (
  key: CoreProviderKey,
  options: Readonly<{
    dependencies?: ReadonlyArray<CoreProviderKey>;
    datasets?: Readonly<Record<string, unknown>>;
    makeDefinition?: CoreDependencyProvider['makeDefinition'];
  }> = {},
): CoreDependencyProvider => ({
  key,
  dependencies: options.dependencies ?? [],
  datasets: options.datasets ?? {},
  makeDefinition: options.makeDefinition ?? (() => definitionOf(key)),
});

const contributionOf = (
  roots: ReadonlyArray<CoreProviderKey>,
  providers: ReadonlyArray<CoreDependencyProvider>,
): CoreProviderContribution => ({ roots, providers });

const compositeNamesOf = (definitions: ReadonlyArray<AnyCompositeDefinition>): Array<string> =>
  definitions.map(definition => `${definition.namespace}/${definition.type}`);

describe('resolveCoreProviderDependencies', () => {
  it('keeps delimiter-bearing namespace and type fields as distinct qualified identities', () => {
    const left = compositeKey('a.b', 'c');
    const right = compositeKey('a', 'b.c');

    const resolved = resolveCoreProviderDependencies({
      contributions: [contributionOf([left, right], [providerOf(left), providerOf(right)])],
    });

    expect(compositeNamesOf(resolved.composites ?? [])).toEqual(['a.b/c', 'a/b.c']);
  });

  it.each([
    { name: 'root namespace', root: compositeKey('', 'card') },
    { name: 'root type', root: compositeKey('third', '') },
    { name: 'root provider name', root: shapeKey('') },
  ])('rejects an empty $name before materialization', ({ root }) => {
    const makeDefinition = vi.fn(() => definitionOf(root.capability === 'composite' ? root : shapeKey('third')));

    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [contributionOf([root], [providerOf(root, { makeDefinition })])],
      }),
    ).toThrow(/non-empty/);
    expect(makeDefinition).not.toHaveBeenCalled();
  });

  it('materializes only the reachable dependency-first closure with a stable first-reach tie break', () => {
    const shared = compositeKey('shared', 'base');
    const left = compositeKey('left', 'card');
    const right = compositeKey('right', 'card');
    const unused = compositeKey('unused', 'card');
    const calls: Array<string> = [];
    const make = (key: CoreProviderKey) =>
      vi.fn(() => {
        calls.push(key.capability === 'composite' ? `${key.namespace}/${key.type}` : key.name);
        return definitionOf(key);
      });
    const sharedMaker = make(shared);
    const leftMaker = make(left);
    const rightMaker = make(right);
    const unusedMaker = make(unused);

    const resolved = resolveCoreProviderDependencies({
      contributions: [
        contributionOf(
          [right, left],
          [
            providerOf(left, { dependencies: [shared], makeDefinition: leftMaker }),
            providerOf(unused, { makeDefinition: unusedMaker }),
            providerOf(shared, { makeDefinition: sharedMaker }),
            providerOf(right, { dependencies: [shared], makeDefinition: rightMaker }),
          ],
        ),
      ],
    });

    expect(compositeNamesOf(resolved.composites ?? [])).toEqual(['shared/base', 'right/card', 'left/card']);
    expect(calls).toEqual(['shared/base', 'right/card', 'left/card']);
    expect(sharedMaker).toHaveBeenCalledTimes(1);
    expect(rightMaker).toHaveBeenCalledTimes(1);
    expect(leftMaker).toHaveBeenCalledTimes(1);
    expect(unusedMaker).not.toHaveBeenCalled();
    expect(Object.isFrozen(resolved)).toBe(true);
  });

  it('merges same-key datasets only when duplicate references are Object.is-identical', () => {
    const key = compositeKey('plot', 'plot');
    const rows = [{ value: 1 }];
    const makeDefinition = vi.fn((datasets: Readonly<Record<string, unknown>>) => {
      expect(datasets).toEqual({ rows, labels: ['A'] });
      expect(datasets.rows).toBe(rows);
      return compositeDefinitionOf('plot', 'plot');
    });

    const resolved = resolveCoreProviderDependencies({
      contributions: [
        contributionOf([key], [providerOf(key, { datasets: { rows }, makeDefinition })]),
        contributionOf([key], [providerOf(key, { datasets: { rows, labels: ['A'] }, makeDefinition })]),
      ],
    });

    expect(compositeNamesOf(resolved.composites ?? [])).toEqual(['plot/plot']);
    expect(makeDefinition).toHaveBeenCalledTimes(1);

    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [
          contributionOf([key], [providerOf(key, { datasets: { rows }, makeDefinition })]),
          contributionOf([key], [providerOf(key, { datasets: { rows: [...rows] }, makeDefinition })]),
        ],
      }),
    ).toThrow(/plot\.plot.*dataset.*rows/i);
  });

  it('allows different provider keys to reuse one dataset reference name', () => {
    const left = shapeKey('left');
    const right = shapeKey('right');
    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [
          contributionOf(
            [left, right],
            [providerOf(left, { datasets: { rows: [1] } }), providerOf(right, { datasets: { rows: [2] } })],
          ),
        ],
      }),
    ).not.toThrow();
  });

  it('keeps same-name providers separate across capabilities', () => {
    const shape = shapeKey('cross');
    const arrow = arrowKey('cross');
    const resolved = resolveCoreProviderDependencies({
      contributions: [contributionOf([shape, arrow], [providerOf(shape), providerOf(arrow)])],
    });
    expect(resolved.shapes?.map(definition => definition.name)).toEqual(['cross']);
    expect(resolved.arrows?.map(definition => definition.name)).toEqual(['cross']);
  });

  it('materializes one complete custom clip provider without a shape dependency', () => {
    const key = clipKey('ticket');
    const definition = clipDefinitionOf('ticket');
    const maker = vi.fn(() => definition);

    const resolved = resolveCoreProviderDependencies({
      contributions: [contributionOf([key], [providerOf(key, { makeDefinition: maker })])],
    });

    expect(maker).toHaveBeenCalledTimes(1);
    expect(resolved).toEqual({ clips: [definition] });
  });

  it('rejects a second explicit complete definition at the same clip key', () => {
    const key = clipKey('ticket');
    const providerDefinition = clipDefinitionOf('ticket');
    const explicitDefinition = clipDefinitionOf('ticket');

    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [contributionOf([key], [providerOf(key, { makeDefinition: () => providerDefinition })])],
        definitions: { clips: [explicitDefinition] },
      }),
    ).toThrow(/definition.*conflict.*clip:ticket/i);
  });

  it('rejects conflicting maker references and ordered dependency declarations before any maker runs', () => {
    const root = compositeKey('third', 'card');
    const firstDependency = compositeKey('standard', 'frame');
    const secondDependency = compositeKey('layout', 'flexLayout');
    const firstMaker = vi.fn(() => definitionOf(root));
    const secondMaker = vi.fn(() => definitionOf(root));
    const dependencyMaker = vi.fn(() => definitionOf(firstDependency));

    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [
          contributionOf([root], [providerOf(root, { makeDefinition: firstMaker })]),
          contributionOf([root], [providerOf(root, { makeDefinition: secondMaker })]),
        ],
      }),
    ).toThrow(/third\.card.*maker/i);
    expect(firstMaker).not.toHaveBeenCalled();
    expect(secondMaker).not.toHaveBeenCalled();

    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [
          contributionOf(
            [root],
            [
              providerOf(root, {
                dependencies: [firstDependency, secondDependency],
                makeDefinition: firstMaker,
              }),
              providerOf(firstDependency, { makeDefinition: dependencyMaker }),
              providerOf(secondDependency),
            ],
          ),
          contributionOf(
            [root],
            [providerOf(root, { dependencies: [secondDependency, firstDependency], makeDefinition: firstMaker })],
          ),
        ],
      }),
    ).toThrow(/third\.card.*dependencies/i);
    expect(firstMaker).not.toHaveBeenCalled();
    expect(dependencyMaker).not.toHaveBeenCalled();
  });

  it('preflights missing roots, missing dependencies, and cycles before any maker runs', () => {
    const root = compositeKey('third', 'card');
    const dependency = compositeKey('standard', 'frame');
    const rootMaker = vi.fn(() => definitionOf(root));
    const dependencyMaker = vi.fn(() => definitionOf(dependency));

    expect(() => resolveCoreProviderDependencies({ contributions: [contributionOf([root], [])] })).toThrow(
      /missing root provider.*composite:third\.card/i,
    );

    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [
          contributionOf([root], [providerOf(root, { dependencies: [dependency], makeDefinition: rootMaker })]),
        ],
      }),
    ).toThrow(/missing dependency provider.*composite:third\.card -> composite:standard\.frame/i);
    expect(rootMaker).not.toHaveBeenCalled();

    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [
          contributionOf(
            [root],
            [
              providerOf(root, { dependencies: [dependency], makeDefinition: rootMaker }),
              providerOf(dependency, { dependencies: [root], makeDefinition: dependencyMaker }),
            ],
          ),
        ],
      }),
    ).toThrow(/provider cycle.*composite:third\.card -> composite:standard\.frame -> composite:third\.card/i);
    expect(rootMaker).not.toHaveBeenCalled();
    expect(dependencyMaker).not.toHaveBeenCalled();
  });

  it('rejects a maker output whose capability or qualified key differs from its provider key', () => {
    const root = shapeKey('cross');
    const makeDefinition = vi.fn(() => arrowDefinitionOf('other'));

    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [contributionOf([root], [providerOf(root, { makeDefinition })])],
      }),
    ).toThrow(/expected shape definition but received arrow/i);
    expect(makeDefinition).toHaveBeenCalledTimes(1);

    const mismatchedName = vi.fn(() => shapeDefinitionOf('other'));
    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [contributionOf([root], [providerOf(root, { makeDefinition: mismatchedName })])],
      }),
    ).toThrow(/provider shape:cross returned definition other/i);
    expect(mismatchedName).toHaveBeenCalledTimes(1);
  });

  it('appends explicit definitions in authored order, deduplicates the same object, and rejects conflicts', () => {
    const root = compositeKey('third', 'card');
    const providerDefinition = compositeDefinitionOf('third', 'card');
    const explicit = compositeDefinitionOf('host', 'overlay');
    const makeDefinition = vi.fn(() => providerDefinition);

    const resolved = resolveCoreProviderDependencies({
      contributions: [contributionOf([root], [providerOf(root, { makeDefinition })])],
      definitions: { composites: [providerDefinition, explicit] },
    });

    expect(resolved.composites).toEqual([providerDefinition, explicit]);
    expect(resolved.composites?.[0]).toBe(providerDefinition);
    expect(resolved.composites?.[1]).toBe(explicit);

    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [contributionOf([root], [providerOf(root, { makeDefinition })])],
        definitions: { composites: [compositeDefinitionOf('third', 'card')] },
      }),
    ).toThrow(/definition.*conflict.*composite:third\.card/i);
  });

  it('snapshots explicit definitions before provider makers execute', () => {
    const root = compositeKey('third', 'card');
    const providerDefinition = compositeDefinitionOf('third', 'card');
    const explicit = compositeDefinitionOf('host', 'overlay');
    const injectedDuringMaterialization = compositeDefinitionOf('host', 'late');
    const composites: Array<AnyCompositeDefinition> = [explicit];
    const makeDefinition = vi.fn(() => {
      composites.push(injectedDuringMaterialization);
      return providerDefinition;
    });

    const resolved = resolveCoreProviderDependencies({
      contributions: [contributionOf([root], [providerOf(root, { makeDefinition })])],
      definitions: { composites },
    });

    expect(resolved.composites).toEqual([providerDefinition, explicit]);
    expect(composites).toEqual([explicit, injectedDuringMaterialization]);
  });
});
