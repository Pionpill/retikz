import {
  compileToScene,
  DEFAULT_RESOLVED_THEME,
  defineThemeStyle,
  resolveCoreProviderDependencies,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import * as Graph from '../../src';
import { primitivesOf } from './test-utils';

const schema = () => Graph.CodeBlockPropsSchema.safeExtend({ namespace: literal('test'), type: literal('service') });
const serviceDefinition = () =>
  Graph.defineCodeBlock({
    namespace: 'test',
    type: 'service',
    schema: schema(),
    compose: (source, context) => [
      Graph.createBlockHeader({ title: { text: source.name, textColor: context.codeBlockTokens.accentColor } }),
      Graph.createBlockSection({ id: 'logic', children: [{ type: 'node', position: [0, 0], text: 'Read source' }] }),
    ],
  });

describe('Code block contribution closure', () => {
  it('compiles a custom Source using only its public contribution and preserves root identity', () => {
    const definition = serviceDefinition();
    const contribution = Graph.createCodeBlockContribution(definition);
    const providers = resolveCoreProviderDependencies({
      contributions: [contribution, Graph.createCodeBlockContribution(definition)],
    });
    const source = schema().parse({
      namespace: 'test',
      type: 'service',
      name: 'Service',
      id: 'service',
      localNamespace: true,
    });
    const output = compileToScene({ type: 'scene', version: 1, children: [source] }, providers);
    expect(JSON.stringify(output.scene)).toContain('Service');
    expect(JSON.stringify(output.scene)).toContain('Read source');
    expect(contribution.roots).toEqual([{ capability: 'composite', namespace: 'test', type: 'service' }]);
  });
  it('resolves a local named Core theme before composing content', () => {
    const definition = serviceDefinition();
    const style = Graph.defineGraphThemeStyle({
      name: 'local',
      resolve: theme => ({ codeBlockTokens: { accentColor: theme.mode === 'dark' ? '#fedcba' : '#123456' } }),
    });
    const providers = resolveCoreProviderDependencies({
      contributions: [Graph.createCodeBlockContribution(definition, { graphThemeStyles: [style] })],
    });
    const source = schema().parse({
      namespace: 'test',
      type: 'service',
      name: 'Local',
      theme: { style: 'local', mode: 'dark' },
    });
    const output = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      { ...providers, themeStyles: [defineThemeStyle({ name: 'local', resolve: () => ({}) })] },
    );
    expect(JSON.stringify(output.scene)).toContain('#fedcba');
  });
  it('diagnoses conflicting definitions instead of silently replacing them', () => {
    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [
          Graph.createCodeBlockContribution(serviceDefinition()),
          Graph.createCodeBlockContribution(serviceDefinition()),
        ],
      }),
    ).toThrow(/conflict/i);
  });
  it('wraps compose failures while preserving the original cause', () => {
    const cause = new Error('compose failed');
    const definition = Graph.defineCodeBlock({
      namespace: 'test',
      type: 'service',
      schema: schema(),
      compose: () => {
        throw cause;
      },
    });
    const providers = resolveCoreProviderDependencies({
      contributions: [Graph.createCodeBlockContribution(definition)],
    });
    expect(() =>
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [schema().parse({ namespace: 'test', type: 'service', name: 'Error' })],
        },
        providers,
      ),
    ).toThrow(expect.objectContaining({ cause: expect.objectContaining({ cause }) }));
  });
});

describe('Code block root and composition semantics', () => {
  it('matches a hand-authored Block for geometry, transforms, clipping, defaults and identity', () => {
    const definition = serviceDefinition();
    const contribution = Graph.createCodeBlockContribution(definition);
    const providers = resolveCoreProviderDependencies({ contributions: [contribution] });
    const source = schema().parse({
      namespace: 'test',
      type: 'service',
      id: 'service',
      name: 'Service',
      localNamespace: true,
      width: 260,
      minWidth: 0,
      transforms: [{ kind: 'translate', x: 15, y: 25 }],
      placement: { target: [100, 100], selfAnchor: 'center' },
      clip: { kind: 'rect', x: 0, y: 0, width: 300, height: 160 },
      meta: { file: 'service.ts' },
      style: { opacity: 0.8 },
      defaults: { node: { style: { textColor: '#123456' } } },
    });
    const actual = compileToScene({ type: 'scene', version: 1, children: [source] }, providers);
    const shell = {
      id: source.id,
      localNamespace: source.localNamespace,
      width: source.width,
      minWidth: source.minWidth,
      transforms: source.transforms,
      placement: source.placement,
      clip: source.clip,
      meta: source.meta,
      style: source.style,
      defaults: source.defaults,
    };
    const name = source.name;
    const block = Graph.createBlock({
      ...shell,
      children: [
        Graph.createBlockHeader({
          title: {
            text: name,
            textColor: Graph.getDefaultGraphThemePreset(DEFAULT_RESOLVED_THEME).codeBlockTokens.accentColor,
          },
        }),
        Graph.createBlockSection({ id: 'logic', children: [{ type: 'node', position: [0, 0], text: 'Read source' }] }),
      ],
    });
    const expected = compileToScene({ type: 'scene', version: 1, children: [block] }, providers);
    expect(actual.scene).toEqual(expected.scene);
    expect(primitivesOf(actual.scene.primitives).filter(item => item.id === 'service')).toHaveLength(1);
  });
  it('compiles multiple definitions and connects an explicit member without generated ids', () => {
    const a = serviceDefinition();
    const otherSchema = Graph.CodeBlockPropsSchema.safeExtend({
      namespace: literal('other'),
      type: literal('service'),
    });
    const b = Graph.defineCodeBlock({
      namespace: 'other',
      type: 'service',
      schema: otherSchema,
      compose: source => [Graph.createBlockHeader({ title: source.name })],
    });
    const providers = resolveCoreProviderDependencies({
      contributions: [Graph.createCodeBlockContribution(a), Graph.createCodeBlockContribution(b)],
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          schema().parse({ namespace: 'test', type: 'service', name: 'A', id: 'a' }),
          otherSchema.parse({
            namespace: 'other',
            type: 'service',
            name: 'B',
            id: 'b',
            transforms: [{ kind: 'translate', x: 300, y: 0 }],
          }),
          Graph.createRelation({ role: 'dependency', source: { id: 'logic' }, target: { id: 'b' } }),
        ],
      },
      {
        ...providers,
        onWarn: warning => {
          throw new Error(warning.message);
        },
      },
    );
    expect(primitivesOf(output.scene.primitives)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'a' }),
        expect.objectContaining({ id: 'b' }),
        expect.objectContaining({ id: 'logic' }),
      ]),
    );
  });
  it('passes graphDefaults to generated descendants and keeps empty composed content as one Block', () => {
    const definition = Graph.defineCodeBlock({
      namespace: 'test',
      type: 'service',
      schema: schema(),
      compose: () => [Graph.createEntity({ role: 'state', position: [0, 0], text: 'Child' })],
    });
    const providers = resolveCoreProviderDependencies({
      contributions: [Graph.createCodeBlockContribution(definition)],
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          schema().parse({
            namespace: 'test',
            type: 'service',
            name: 'Service',
            graphDefaults: { entity: { style: { fill: '#fedcba' } } },
          }),
        ],
      },
      providers,
    );
    expect(JSON.stringify(output.scene)).toContain('#fedcba');
    const empty = Graph.defineCodeBlock({ namespace: 'test', type: 'service', schema: schema(), compose: () => [] });
    const emptyProviders = resolveCoreProviderDependencies({
      contributions: [Graph.createCodeBlockContribution(empty)],
    });
    const emptyOutput = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [schema().parse({ namespace: 'test', type: 'service', name: 'Empty', id: 'empty' })],
      },
      emptyProviders,
    );
    expect(primitivesOf(emptyOutput.scene.primitives).filter(item => item.id === 'empty')).toHaveLength(1);
  });
});
