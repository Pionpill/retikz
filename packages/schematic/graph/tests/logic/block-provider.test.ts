import type { CoreDependencyProvider } from '@retikz/core';
import { compileToScene, CompositeBaseSchema, defineComposite, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import * as Graph from '../../src';

describe('Block 提供者关闭', () => {
  it('解析 Block、公共结构、Entity、Relation、FlexLayout 和 Surface', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.BlockProviderKey], providers: Graph.createGraphProviders() }],
    });
    const keys = definitions.composites?.map(definition => `${definition.namespace}.${definition.type}`);

    expect(keys).toEqual(
      expect.arrayContaining([
        'graph.block',
        'graph.blockHeader',
        'graph.blockSection',
        'graph.blockRow',
        'graph.entity',
        'graph.relation',
        'layout.flexLayout',
        'standard.surface',
      ]),
    );
    expect(keys).not.toContain('graph.internalBlockRegion');
  });

  it('使结构提供者独立于 Block 和 Group 提供者', () => {
    for (const root of [Graph.BlockHeaderProviderKey, Graph.BlockSectionProviderKey, Graph.BlockRowProviderKey]) {
      const definitions = resolveCoreProviderDependencies({
        contributions: [{ roots: [root], providers: Graph.createGraphProviders() }],
      });
      const keys = definitions.composites?.map(definition => `${definition.namespace}.${definition.type}`);

      expect(keys).not.toContain('graph.block');
      expect(keys).not.toContain('graph.group');
      expect(keys).toEqual(expect.arrayContaining(['graph.entity', 'graph.relation', 'layout.flexLayout']));
    }
  });

  it('通过 Core 提供者路径将自定义第 3 层复合下沉到 Block', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'serviceBlock',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('serviceBlock') }),
      compile: () => ({
        children: [
          Graph.createBlock({
            children: [Graph.createBlockHeader({ title: { text: 'Service' } })],
          }),
        ],
      }),
    });
    const provider: CoreDependencyProvider = Object.freeze({
      key: Object.freeze({ capability: 'composite', namespace: 'test', type: 'serviceBlock' }),
      dependencies: Object.freeze([Graph.BlockProviderKey]),
      makeDefinition: () => definition,
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [provider.key], providers: [provider, ...Graph.createGraphProviders()] }],
    });
    const output = compileToScene(
      { type: 'scene', version: 1, children: [{ namespace: 'test', type: 'serviceBlock' }] },
      { ...definitions, padding: 0 },
    );

    expect(JSON.stringify(output.scene.primitives)).toContain('Service');
  });

  it('不导出 Cell 组合或已删除的内部区域运行时', () => {
    expect('BlockCellDefinition' in Graph).toBe(false);
    expect('BlockCellProviderKey' in Graph).toBe(false);
    expect('InternalBlockRegionProvider' in Graph).toBe(false);
    expect('BlockRegionSchema' in Graph).toBe(false);
  });
});
