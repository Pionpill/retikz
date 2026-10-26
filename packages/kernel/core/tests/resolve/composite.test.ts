import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

import type { AnyCompositeDefinition, IRComposite } from '../../src';
import { CompositeBaseSchema, defineComposite } from '../../src';
import { bindComposite, resolveComposite } from '../../src/resolve';

const source = (overrides: Record<string, unknown> = {}): IRComposite => ({
  namespace: 'test',
  type: 'box',
  value: 3,
  ...overrides,
});

const expandDefinition = defineComposite({
  namespace: 'test',
  type: 'box',
  schema: CompositeBaseSchema.extend({
    namespace: literal('test'),
    type: literal('box'),
    value: number(),
  }),
  compile: node => ({ children: [{ type: 'node', position: [node.value, 0] }] }),
});

const layoutDefinition = defineComposite({
  namespace: 'test',
  type: 'layout',
  schema: CompositeBaseSchema.extend({
    namespace: literal('test'),
    type: literal('layout'),
    value: number(),
  }),
  artifactSchema: strictObject({ value: number() }),
  compile: node => ({ children: [], artifact: { value: node.value } }),
});

const registryOf = (...definitions: ReadonlyArray<AnyCompositeDefinition>) =>
  new Map(definitions.map(definition => [`${definition.namespace}.${definition.type}`, definition]));

describe('resolveComposite', () => {
  it('当组合未注册时返回规范提供者键', () => {
    expect(bindComposite(source(), new Map())).toEqual({
      kind: 'unregistered',
      key: 'test.box',
    });
  });

  it('绑定并解析一次组合', () => {
    const binding = bindComposite(source(), registryOf(expandDefinition));
    if (binding.kind === 'unregistered') throw new Error('expected registered binding');

    const resolution = resolveComposite(binding, 'children[0]');

    expect(resolution).toMatchObject({ kind: 'compile', key: 'test.box', node: source() });

    expect(resolution.compile).toBe(expandDefinition.compile);
  });

  it('将布局感知组合与其产物 schema 绑定', () => {
    const binding = bindComposite(source({ type: 'layout' }), registryOf(layoutDefinition));
    if (binding.kind === 'unregistered') throw new Error('expected registered binding');

    const resolution = resolveComposite(binding, 'children[0]');

    expect(resolution).toMatchObject({ kind: 'compile', key: 'test.layout', node: source({ type: 'layout' }) });

    expect(resolution.artifactSchema).toBe(layoutDefinition.artifactSchema);
  });

  it('当负载解析失败时报告提供者键和 IR 定位器', () => {
    const binding = bindComposite(source({ value: 'invalid' }), registryOf(expandDefinition));
    if (binding.kind === 'unregistered') throw new Error('expected registered binding');

    expect(() => resolveComposite(binding, 'children[2]')).toThrow(
      /composite 'test\.box' failed payload validation at children\[2\]/u,
    );
  });
});
