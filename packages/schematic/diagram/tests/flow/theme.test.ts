import type { CanonicalTheme } from '@retikz/core';
import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../src/errors';
import type { FlowThemeDefinition } from '../../src/flow';
import { defineFlowTheme } from '../../src/flow';
import { resolveFlowThemeRegistry } from '../../src/flow/providers';
import { resolveFlowDiagram } from '../../src/flow/resolve';
import { parseTestFlowDiagram } from './fixtures';

const themeWith = (overrides: Partial<CanonicalTheme>): CanonicalTheme => ({
  ...DEFAULT_RESOLVED_THEME,
  ...overrides,
});

const registryOf = (...definitions: ReadonlyArray<FlowThemeDefinition>): ReadonlyMap<string, FlowThemeDefinition> =>
  resolveFlowThemeRegistry(definitions);

describe('Flow 主题 Definition 和注册表', () => {
  it('将确切的 Definition 对象保留为类型标识', () => {
    const definition = {
      name: 'brand',
      resolve: () => ({ entity: { style: { opacity: 0.8 } } }),
    } satisfies FlowThemeDefinition;

    expect(defineFlowTheme(definition)).toBe(definition);
  });

  it('删除相同身份的重复数据并拒绝冲突的名称', () => {
    const brand = defineFlowTheme({
      name: 'brand',
      resolve: () => ({ entity: { style: { opacity: 0.8 } } }),
    });

    expect([...resolveFlowThemeRegistry([brand, brand]).keys()]).toEqual(['brand']);

    for (const run of [() => resolveFlowThemeRegistry([brand, { ...brand }])]) {
      expect(run).toThrowError(RetikzDiagramError);
    }
  });

  it('当 Core 样式缺少同名的 Flow Definition 时，会明确报错', () => {
    const source = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'entity', text: 'Entity' }],
      groups: [],
      layouts: [],
      children: ['entity'],
    });

    try {
      resolveFlowDiagram(source, {
        theme: themeWith({ name: 'missing' }),
        flowThemeDefinitions: registryOf(),
      });

      expect.unreachable('Expected missing Flow Theme failure');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;

      expect(error.code).toBe(RetikzDiagramErrorCode.DefinitionNotRegistered);
      expect(error.details).toMatchObject({
        capability: 'flow-theme',
        key: 'missing',
        availableKeys: [],
      });
    }
  });

  it.each([
    [
      'callback error',
      () => {
        throw new Error('external callback failed');
      },
    ],
  ])('以 Definition 为原因包装无效的 %s 输出', (_label, resolve) => {
    const source = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'entity', text: 'Entity' }],
      groups: [],
      layouts: [],
      children: ['entity'],
    });
    const definition = defineFlowTheme({ name: 'invalid', resolve });

    try {
      resolveFlowDiagram(source, {
        theme: themeWith({ name: 'invalid' }),
        flowThemeDefinitions: registryOf(definition),
      });

      expect.unreachable('Expected invalid Flow Theme callback output');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;

      expect(error.code).toBe(RetikzDiagramErrorCode.DefinitionCallbackFailed);
      expect(error.details).toMatchObject({ capability: 'flow-theme', key: 'invalid' });
      expect(error.cause).toBeDefined();
    }
  });
});

describe('Flow 主题级联', () => {
  it('按顺序应用命名默认值、作者默认值、Group 布局和项目覆盖', () => {
    const brand = defineFlowTheme({
      name: 'brand',
      resolve: () => ({
        layout: { nodeGap: 8 },
        entity: { style: { opacity: 0.4, dashed: true, fill: '#fef3c7', font: { family: 'Inter', size: 12 } } },
      }),
    });
    const source = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      defaultFlow: {
        layout: { nodeGap: 12, rankGap: 24 },
        entity: { style: { fill: 'transparent', opacity: 0.7, font: { size: 16 } }, layout: { margin: 2 } },
      },
      entities: [
        {
          id: 'entity',
          text: 'Entity',
          style: { opacity: 0, dashed: false, font: { weight: 700 } },
          layout: { margin: 0 },
        },
      ],
      groups: [{ id: 'group', layout: { nodeGap: 20 }, children: ['entity'] }],
      layouts: [],
      children: ['group'],
    });

    const resolved = resolveFlowDiagram(source, {
      theme: themeWith({ name: 'brand' }),
      flowThemeDefinitions: registryOf(brand),
    });
    const group = resolved.elements[0];
    if (group.type !== 'group') throw new Error('Expected Group');

    const entity = group.elements[0];
    if (entity.type !== 'entity') throw new Error('Expected Entity');

    expect(resolved.layout).toMatchObject({ nodeGap: 12, rankGap: 24 });
    expect(group.layout).toEqual({ nodeGap: 20 });
    expect(entity.style).toMatchObject({
      opacity: { overall: 0 },
      dashed: false,
      fill: 'transparent',
      font: { weight: 700 },
    });
    expect(entity.layout).toMatchObject({ margin: 0 });
  });
});
