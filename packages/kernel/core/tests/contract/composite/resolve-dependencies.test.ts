import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type {
  AnyCompositeDefinition,
  CompositeDependencyContribution,
  CompositeDependencyProvider,
  CompositeProviderKey,
} from '../../../src';

import { defineComposite, resolveCompositeDependencies } from '../../../src';

const providerKey = (namespace: string, type: string): CompositeProviderKey => ({ namespace, type });

const definitionOf = (namespace: string, type: string): AnyCompositeDefinition =>
  defineComposite({
    namespace,
    type,
    schema: z.strictObject({ namespace: z.literal(namespace), type: z.literal(type) }),
    expand: () => ({ children: [] }),
  });

const providerOf = (
  key: CompositeProviderKey,
  options: Readonly<{
    dependencies?: ReadonlyArray<CompositeProviderKey>;
    datasets?: Readonly<Record<string, unknown>>;
    makeDefinition?: CompositeDependencyProvider['makeDefinition'];
  }> = {},
): CompositeDependencyProvider => ({
  key,
  dependencies: options.dependencies ?? [],
  datasets: options.datasets ?? {},
  makeDefinition: options.makeDefinition ?? (() => definitionOf(key.namespace, key.type)),
});

const contributionOf = (
  roots: ReadonlyArray<CompositeProviderKey>,
  providers: ReadonlyArray<CompositeDependencyProvider>,
): CompositeDependencyContribution => ({ roots, providers });

const keysOf = (definitions: ReadonlyArray<AnyCompositeDefinition>): Array<string> =>
  definitions.map(definition => `${definition.namespace}/${definition.type}`);

describe('resolveCompositeDependencies', () => {
  it('keeps delimiter-bearing namespace and type fields as distinct qualified identities', () => {
    const left = providerKey('a.b', 'c');
    const right = providerKey('a', 'b.c');

    const resolved = resolveCompositeDependencies({
      contributions: [contributionOf([left, right], [providerOf(left), providerOf(right)])],
    });

    expect(keysOf(resolved)).toEqual(['a.b/c', 'a/b.c']);
  });

  it.each([
    { name: 'root namespace', root: providerKey('', 'card') },
    { name: 'root type', root: providerKey('third', '') },
  ])('rejects an empty $name before materialization', ({ root }) => {
    const makeDefinition = vi.fn(() => definitionOf('third', 'card'));

    expect(() =>
      resolveCompositeDependencies({
        contributions: [contributionOf([root], [providerOf(root, { makeDefinition })])],
      }),
    ).toThrow(/non-empty namespace and type/);
    expect(makeDefinition).not.toHaveBeenCalled();
  });

  it('materializes only the reachable dependency-first closure with a stable first-reach tie break', () => {
    const shared = providerKey('shared', 'base');
    const left = providerKey('left', 'card');
    const right = providerKey('right', 'card');
    const unused = providerKey('unused', 'card');
    const calls: Array<string> = [];
    const make = (key: CompositeProviderKey) =>
      vi.fn(() => {
        calls.push(`${key.namespace}/${key.type}`);
        return definitionOf(key.namespace, key.type);
      });
    const sharedMaker = make(shared);
    const leftMaker = make(left);
    const rightMaker = make(right);
    const unusedMaker = make(unused);

    const resolved = resolveCompositeDependencies({
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

    expect(keysOf(resolved)).toEqual(['shared/base', 'right/card', 'left/card']);
    expect(calls).toEqual(['shared/base', 'right/card', 'left/card']);
    expect(sharedMaker).toHaveBeenCalledTimes(1);
    expect(rightMaker).toHaveBeenCalledTimes(1);
    expect(leftMaker).toHaveBeenCalledTimes(1);
    expect(unusedMaker).not.toHaveBeenCalled();
    expect(Object.isFrozen(resolved)).toBe(true);
  });

  it('merges same-key datasets only when duplicate references are Object.is-identical', () => {
    const key = providerKey('plot', 'plot');
    const rows = [{ value: 1 }];
    const makeDefinition = vi.fn((datasets: Readonly<Record<string, unknown>>) => {
      expect(datasets).toEqual({ rows, labels: ['A'] });
      expect(datasets.rows).toBe(rows);
      return definitionOf(key.namespace, key.type);
    });
    const dependencies: ReadonlyArray<CompositeProviderKey> = [];

    const resolved = resolveCompositeDependencies({
      contributions: [
        contributionOf([key], [providerOf(key, { dependencies, datasets: { rows }, makeDefinition })]),
        contributionOf([key], [providerOf(key, { dependencies, datasets: { rows, labels: ['A'] }, makeDefinition })]),
      ],
    });

    expect(keysOf(resolved)).toEqual(['plot/plot']);
    expect(makeDefinition).toHaveBeenCalledTimes(1);

    expect(() =>
      resolveCompositeDependencies({
        contributions: [
          contributionOf([key], [providerOf(key, { dependencies, datasets: { rows }, makeDefinition })]),
          contributionOf([key], [providerOf(key, { dependencies, datasets: { rows: [...rows] }, makeDefinition })]),
        ],
      }),
    ).toThrow(/plot\.plot.*dataset.*rows/i);
  });

  it('allows different provider keys to reuse one dataset reference name', () => {
    const left = providerKey('left', 'card');
    const right = providerKey('right', 'card');

    expect(() =>
      resolveCompositeDependencies({
        contributions: [
          contributionOf(
            [left, right],
            [providerOf(left, { datasets: { rows: [1] } }), providerOf(right, { datasets: { rows: [2] } })],
          ),
        ],
      }),
    ).not.toThrow();
  });

  it('rejects conflicting maker references and ordered dependency declarations before any maker runs', () => {
    const root = providerKey('third', 'card');
    const firstDependency = providerKey('standard', 'frame');
    const secondDependency = providerKey('layout', 'flexLayout');
    const firstMaker = vi.fn(() => definitionOf(root.namespace, root.type));
    const secondMaker = vi.fn(() => definitionOf(root.namespace, root.type));
    const dependencyMaker = vi.fn(() => definitionOf(firstDependency.namespace, firstDependency.type));

    expect(() =>
      resolveCompositeDependencies({
        contributions: [
          contributionOf([root], [providerOf(root, { makeDefinition: firstMaker })]),
          contributionOf([root], [providerOf(root, { makeDefinition: secondMaker })]),
        ],
      }),
    ).toThrow(/third\.card.*maker/i);
    expect(firstMaker).not.toHaveBeenCalled();
    expect(secondMaker).not.toHaveBeenCalled();

    expect(() =>
      resolveCompositeDependencies({
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
            [
              providerOf(root, {
                dependencies: [secondDependency, firstDependency],
                makeDefinition: firstMaker,
              }),
            ],
          ),
        ],
      }),
    ).toThrow(/third\.card.*dependencies/i);
    expect(firstMaker).not.toHaveBeenCalled();
    expect(dependencyMaker).not.toHaveBeenCalled();
  });

  it('preflights missing roots, missing dependencies, and cycles before any maker runs', () => {
    const root = providerKey('third', 'card');
    const dependency = providerKey('standard', 'frame');
    const rootMaker = vi.fn(() => definitionOf(root.namespace, root.type));
    const dependencyMaker = vi.fn(() => definitionOf(dependency.namespace, dependency.type));

    const resolveMissingRoot = () => resolveCompositeDependencies({ contributions: [contributionOf([root], [])] });
    expect(resolveMissingRoot).toThrow(/missing root provider/i);
    expect(resolveMissingRoot).toThrow(/third\.card/i);

    const resolveMissingDependency = () =>
      resolveCompositeDependencies({
        contributions: [
          contributionOf([root], [providerOf(root, { dependencies: [dependency], makeDefinition: rootMaker })]),
        ],
      });
    expect(resolveMissingDependency).toThrow(/missing dependency provider/i);
    expect(resolveMissingDependency).toThrow(/third\.card -> standard\.frame/i);
    expect(rootMaker).not.toHaveBeenCalled();

    const resolveCycle = () =>
      resolveCompositeDependencies({
        contributions: [
          contributionOf(
            [root],
            [
              providerOf(root, { dependencies: [dependency], makeDefinition: rootMaker }),
              providerOf(dependency, { dependencies: [root], makeDefinition: dependencyMaker }),
            ],
          ),
        ],
      });
    expect(resolveCycle).toThrow(/provider cycle/i);
    expect(resolveCycle).toThrow(/third\.card -> standard\.frame -> third\.card/i);
    expect(rootMaker).not.toHaveBeenCalled();
    expect(dependencyMaker).not.toHaveBeenCalled();
  });

  it('rejects a maker output whose qualified key differs from its provider key', () => {
    const root = providerKey('third', 'card');
    const makeDefinition = vi.fn(() => definitionOf('third', 'other'));

    expect(() =>
      resolveCompositeDependencies({
        contributions: [contributionOf([root], [providerOf(root, { makeDefinition })])],
      }),
    ).toThrow(/third\.card.*third\.other/i);
    expect(makeDefinition).toHaveBeenCalledTimes(1);
  });

  it('appends explicit definitions in authored order, deduplicates the same object, and rejects conflicts', () => {
    const root = providerKey('third', 'card');
    const providerDefinition = definitionOf(root.namespace, root.type);
    const explicit = definitionOf('host', 'overlay');
    const makeDefinition = vi.fn(() => providerDefinition);

    const resolved = resolveCompositeDependencies({
      contributions: [contributionOf([root], [providerOf(root, { makeDefinition })])],
      composites: [providerDefinition, explicit],
    });

    expect(resolved).toEqual([providerDefinition, explicit]);
    expect(resolved[0]).toBe(providerDefinition);
    expect(resolved[1]).toBe(explicit);

    expect(() =>
      resolveCompositeDependencies({
        contributions: [contributionOf([root], [providerOf(root, { makeDefinition })])],
        composites: [definitionOf(root.namespace, root.type)],
      }),
    ).toThrow(/definition.*conflict.*third\.card/i);
  });

  it('snapshots explicit definitions before provider makers execute', () => {
    const root = providerKey('third', 'card');
    const providerDefinition = definitionOf(root.namespace, root.type);
    const explicit = definitionOf('host', 'overlay');
    const injectedDuringMaterialization = definitionOf('host', 'late');
    const composites: Array<AnyCompositeDefinition> = [explicit];
    const makeDefinition = vi.fn(() => {
      composites.push(injectedDuringMaterialization);
      return providerDefinition;
    });

    const resolved = resolveCompositeDependencies({
      contributions: [contributionOf([root], [providerOf(root, { makeDefinition })])],
      composites,
    });

    expect(resolved).toEqual([providerDefinition, explicit]);
    expect(composites).toEqual([explicit, injectedDuringMaterialization]);
  });
});
