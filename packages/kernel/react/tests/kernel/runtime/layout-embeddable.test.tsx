import type { AnyCompositeDefinition, CompositeDependencyProvider, CompositeProviderKey } from '@retikz/core';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Layout, Node } from '../../../src';

type FixtureProps = { id: string; data: unknown };
type DefinitionMaker = CompositeDependencyProvider['makeDefinition'];

type EmbeddableFixture = FC<FixtureProps> & {
  isTier2Embeddable?: boolean;
  inputEmbedAdapter?: InputEmbedAdapter<FixtureProps>;
};

const definitionOf = (key: CompositeProviderKey): AnyCompositeDefinition => {
  const schema = CompositeBaseSchema.extend({
    namespace: z.literal(key.namespace),
    type: z.literal(key.type),
    panelId: z.string(),
  });
  return defineComposite({
    namespace: key.namespace,
    type: key.type,
    schema,
    expand: node => ({
      children: [{ type: 'node', id: `${key.namespace}-${node.panelId}`, position: [0, 0], text: node.panelId }],
    }),
  });
};

const providerOf = (
  key: CompositeProviderKey,
  makeDefinition: DefinitionMaker,
  datasets: Readonly<Record<string, unknown>> = {},
  dependencies: ReadonlyArray<CompositeProviderKey> = [],
): CompositeDependencyProvider => ({ key, dependencies, datasets, makeDefinition });

const makeFixture = (options: {
  displayName: string;
  key: CompositeProviderKey;
  makeDefinition: DefinitionMaker;
  datasets?: Readonly<Record<string, unknown>>;
  dependencies?: ReadonlyArray<CompositeProviderKey>;
  extraProviders?: ReadonlyArray<CompositeDependencyProvider>;
  roots?: ReadonlyArray<CompositeProviderKey>;
}): EmbeddableFixture => {
  const adapter: InputEmbedAdapter<FixtureProps> = {
    kind: options.displayName,
    lower: props => ({
      node: { namespace: options.key.namespace, type: options.key.type, panelId: props.id },
      compositeDependencies: {
        roots: options.roots ?? [options.key],
        providers: [
          providerOf(options.key, options.makeDefinition, options.datasets, options.dependencies),
          ...(options.extraProviders ?? []),
        ],
      },
    }),
  };
  const Fixture: EmbeddableFixture = () => null;
  Fixture.displayName = options.displayName;
  Fixture.isTier2Embeddable = true;
  Fixture.inputEmbedAdapter = adapter;
  return Fixture;
};

describe('<Layout> Composite provider graph', () => {
  it('merges same-key datasets by identity and materializes one provider definition for multiple instances', () => {
    const key = { namespace: 'demo', type: 'panel' } as const;
    const dataA = { rows: [1, 2] };
    const dataB = { rows: [3, 4] };
    const makeDefinition = vi.fn((datasets: Readonly<Record<string, unknown>>) => {
      expect(datasets).toEqual({ a: dataA, b: dataB });
      return definitionOf(key);
    });
    const First = makeFixture({ displayName: 'First', key, makeDefinition, datasets: { a: dataA } });
    const Second = makeFixture({ displayName: 'Second', key, makeDefinition, datasets: { b: dataB } });

    const svg = renderToStaticMarkup(
      <Layout width={100} height={100}>
        <First id="one" data={dataA} />
        <Second id="two" data={dataB} />
      </Layout>,
    );

    expect(makeDefinition).toHaveBeenCalledTimes(1);
    expect(svg).toContain('data-retikz-id="demo-one"');
    expect(svg).toContain('data-retikz-id="demo-two"');
  });

  it('resolves cross-namespace dependencies before their authored root', () => {
    const frameKey = { namespace: 'standard', type: 'frame' } as const;
    const cardKey = { namespace: 'third', type: 'card' } as const;
    const calls: Array<string> = [];
    const frameMaker = vi.fn(() => {
      calls.push('standard.frame');
      return definitionOf(frameKey);
    });
    const cardMaker = vi.fn(() => {
      calls.push('third.card');
      return definitionOf(cardKey);
    });
    const Card = makeFixture({
      displayName: 'Card',
      key: cardKey,
      makeDefinition: cardMaker,
      dependencies: [frameKey],
      extraProviders: [providerOf(frameKey, frameMaker)],
    });

    const svg = renderToStaticMarkup(
      <Layout width={100} height={100}>
        <Card id="one" data={null} />
      </Layout>,
    );

    expect(calls).toEqual(['standard.frame', 'third.card']);
    expect(svg).toContain('data-retikz-id="third-one"');
  });

  it('uses explicit Layout composites only as final definitions after provider materialization', () => {
    const demoKey = { namespace: 'demo', type: 'panel' } as const;
    const userKey = { namespace: 'user', type: 'panel' } as const;
    const demoMaker = vi.fn(() => definitionOf(demoKey));
    const Demo = makeFixture({ displayName: 'Demo', key: demoKey, makeDefinition: demoMaker });
    const userAdapter: InputEmbedAdapter<FixtureProps> = {
      kind: 'User',
      lower: props => ({
        node: { namespace: userKey.namespace, type: userKey.type, panelId: props.id },
        compositeDependencies: { roots: [], providers: [] },
      }),
    };
    const User: EmbeddableFixture = () => null;
    User.displayName = 'User';
    User.isTier2Embeddable = true;
    User.inputEmbedAdapter = userAdapter;

    const svg = renderToStaticMarkup(
      <Layout width={100} height={100} composites={[definitionOf(userKey)]}>
        <Demo id="embedded" data={null} />
        <User id="manual" data={null} />
      </Layout>,
    );

    expect(demoMaker).toHaveBeenCalledTimes(1);
    expect(svg).toContain('data-retikz-id="demo-embedded"');
    expect(svg).toContain('data-retikz-id="user-manual"');
  });

  it('forwards Core missing-provider, cycle, dataset, and explicit-definition conflict diagnostics', () => {
    const key = { namespace: 'demo', type: 'panel' } as const;
    const dependency = { namespace: 'standard', type: 'frame' } as const;
    const makeDefinition = vi.fn(() => definitionOf(key));
    const Missing = makeFixture({
      displayName: 'Missing',
      key,
      makeDefinition,
      dependencies: [dependency],
    });
    expect(() =>
      renderToStaticMarkup(
        <Layout width={100} height={100}>
          <Missing id="missing" data={null} />
        </Layout>,
      ),
    ).toThrow(/missing dependency provider.*demo\.panel -> standard\.frame/i);
    expect(makeDefinition).not.toHaveBeenCalled();

    const dependencyMaker = vi.fn(() => definitionOf(dependency));
    const Cyclic = makeFixture({
      displayName: 'Cyclic',
      key,
      makeDefinition,
      dependencies: [dependency],
      extraProviders: [providerOf(dependency, dependencyMaker, {}, [key])],
    });
    expect(() =>
      renderToStaticMarkup(
        <Layout width={100} height={100}>
          <Cyclic id="cycle" data={null} />
        </Layout>,
      ),
    ).toThrow(/provider cycle.*demo\.panel -> standard\.frame -> demo\.panel/i);
    expect(makeDefinition).not.toHaveBeenCalled();
    expect(dependencyMaker).not.toHaveBeenCalled();

    const First = makeFixture({ displayName: 'FirstDataset', key, makeDefinition, datasets: { shared: { x: 1 } } });
    const Second = makeFixture({ displayName: 'SecondDataset', key, makeDefinition, datasets: { shared: { x: 1 } } });
    expect(() =>
      renderToStaticMarkup(
        <Layout width={100} height={100}>
          <First id="a" data={null} />
          <Second id="b" data={null} />
        </Layout>,
      ),
    ).toThrow(/demo\.panel.*dataset.*shared/i);

    const Valid = makeFixture({ displayName: 'Valid', key, makeDefinition });
    expect(() =>
      renderToStaticMarkup(
        <Layout width={100} height={100} composites={[definitionOf(key)]}>
          <Valid id="conflict" data={null} />
        </Layout>,
      ),
    ).toThrow(/definition conflict.*demo\.panel/i);
  });

  it('keeps a pure Kernel Layout unchanged when no contribution exists', () => {
    const svg = renderToStaticMarkup(
      <Layout width={100} height={100}>
        <Node id="plain" position={[0, 0]} text="hi" />
      </Layout>,
    );

    expect(svg).toContain('data-retikz-id="plain"');
  });
});
