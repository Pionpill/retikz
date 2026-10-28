import { compileToScene, DEFAULT_RESOLVED_THEME, defineTheme, resolveCoreProviderDependencies } from '@retikz/core';
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

describe('代码块贡献关闭', () => {
  it('仅使用其公共贡献来编译自定义 Source 并保留根身份', () => {
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

  it('在编写内容之前解析本地名为 Core 的主题', () => {
    const definition = serviceDefinition();
    const style = Graph.defineGraphTheme({
      name: 'local',
      resolve: theme => ({ codeBlockTokens: { accentColor: theme.mode === 'dark' ? '#fedcba' : '#123456' } }),
    });
    const providers = resolveCoreProviderDependencies({
      contributions: [Graph.createCodeBlockContribution(definition, { graphThemeDefinitions: [style] })],
    });
    const source = schema().parse({
      namespace: 'test',
      type: 'service',
      name: 'Local',
      theme: { name: 'local', mode: 'dark' },
    });
    const output = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      { ...providers, themeDefinitions: [defineTheme({ name: 'local', resolve: () => ({}) })] },
    );

    expect(JSON.stringify(output.scene)).toContain('#fedcba');
  });

  it('诊断冲突的定义，而不是默默地替换它们', () => {
    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [
          Graph.createCodeBlockContribution(serviceDefinition()),
          Graph.createCodeBlockContribution(serviceDefinition()),
        ],
      }),
    ).toThrow(/conflict/i);
  });

  it('包装组合失败，同时保留原始原因', () => {
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

describe('代码块根和组合语义', () => {
  it('与手工编写的 Block 匹配，用于几何、变换、裁剪、默认值和标识', () => {
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
      position: { kind: 'anchor', target: [100, 100], selfAnchor: 'center' },
      clip: { kind: 'rect', params: { x: 0, y: 0, width: 300, height: 160 } },
      meta: { file: 'service.ts' },
      defaults: { style: { opacity: 0.8 }, node: { style: { textColor: '#123456' } } },
    });
    const actual = compileToScene({ type: 'scene', version: 1, children: [source] }, providers);
    const shell = {
      id: source.id,
      localNamespace: source.localNamespace,
      width: source.width,
      minWidth: source.minWidth,
      transforms: source.transforms,
      position: source.position,
      clip: source.clip,
      meta: source.meta,
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

  it('编译多个定义并连接显式成员而不生成 id', () => {
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

  it('将 defaultGraph 传递给生成的后代，并将空的组合内容保留为一个 Block', () => {
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
            defaultGraph: { entity: { style: { fill: '#fedcba' } } },
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
