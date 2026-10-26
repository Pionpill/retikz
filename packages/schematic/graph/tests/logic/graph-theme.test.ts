import type { CompileWarning, ResolvedTheme } from '@retikz/core';
import {
  compileToScene,
  DEFAULT_RESOLVED_THEME,
  defineTheme,
  resolveCoreProviderDependencies,
  resolveDefaultCoreThemeColors,
  RetikzCoreErrorCode,
  ThemeMode,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const themeWithName = (name: string): ResolvedTheme => ({ ...DEFAULT_RESOLVED_THEME, name });

const styleRegistry = (definition: Graph.GraphThemeDefinition): ReadonlyMap<string, Graph.GraphThemeDefinition> =>
  new Map([[definition.name, definition]]);

describe('Graph Scope 和 Theme 编译语义', () => {
  it.each([
    { mode: ThemeMode.Light, color: '#777777' },
    { mode: ThemeMode.Dark, color: '#888888' },
  ])('在 $mode 模式下提供完整的模式感知中性 Entity 基线', ({ mode, color }) => {
    const theme: ResolvedTheme = {
      ...DEFAULT_RESOLVED_THEME,
      mode,
      colors: resolveDefaultCoreThemeColors(mode),
    };

    expect(Graph.getDefaultGraphThemePreset(theme).defaults.entity?.style).toEqual({
      color,
      textColor: 'contrast',
      fill: 0.12,
      stroke: 1,
      strokeWidth: 1,
      opacity: { overall: 1, fill: 1, stroke: 1 },
    });
    expect(Graph.getDefaultGraphThemePreset(theme).defaults.group).toEqual({
      background: { fill: 'lightgray', opacity: { fill: 0.04 } },
      border: { stroke: 'lightgray', strokeWidth: 1, dashPattern: [4, 3] },
      cornerRadius: 4,
    });
    expect(Graph.getDefaultGraphThemePreset(theme).defaults.block).toEqual({
      background: { fill: 'none' },
      border: { stroke: 'currentColor', strokeWidth: 1, opacity: { stroke: 0.2 } },
      cornerRadius: 8,
    });
  });

  it('将静态 Entity 母版具体化为同色描边、不透明光填充和对比文本', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.EntityProviderKey], providers: Graph.createGraphProviders() }],
    });
    const warnings: Array<CompileWarning> = [];
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        theme: { mode: ThemeMode.Light },
        children: [
          Graph.EntitySchema.parse({
            namespace: 'graph',
            type: 'entity',
            role: 'activity',
            position: [0, 0],
            text: 'Static master',
            style: { color: '#336699' },
          }),
        ],
      },
      { ...definitions, padding: 0, onWarn: warning => warnings.push(warning) },
    );
    const scene = JSON.stringify(output.scene);

    expect(scene).toContain('#336699');
    expect(scene).toContain('#e7edf3');
    expect(scene).toContain('#000000');
    expect(warnings).toEqual([]);
  });

  it('非静态 Entity 母版会明确报错，直到两个上下文绘制通道都被覆盖', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.EntityProviderKey], providers: Graph.createGraphProviders() }],
    });
    const source = {
      namespace: 'graph',
      type: 'entity',
      role: 'activity',
      position: [0, 0],
      text: 'Inherited CSS color',
      style: { color: 'currentColor' },
    } as const;

    expect(() =>
      compileToScene(
        { type: 'scene', version: 1, children: [Graph.EntitySchema.parse(source)] },
        { ...definitions, padding: 0 },
      ),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzCoreErrorCode.LayoutProbeRecoverable,
        cause: expect.objectContaining({ code: RetikzCoreErrorCode.Color }),
      }),
    );

    const warnings: Array<CompileWarning> = [];
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          Graph.EntitySchema.parse({ ...source, style: { ...source.style, fill: '#f1f5f9', stroke: 'currentColor' } }),
        ],
      },
      { ...definitions, padding: 0, onWarn: warning => warnings.push(warning) },
    );

    expect(JSON.stringify(output.scene)).toContain('#f1f5f9');
    expect(warnings).toEqual([]);
  });

  it('在最终 Entity 实例主色后解析 Graph Theme 的数值 fill', () => {
    const definition = Graph.defineGraphTheme({
      name: 'contextual-entity',
      resolve: () => ({ defaults: { entity: { style: { fill: 0.2 } } } }),
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        {
          roots: [Graph.EntityProviderKey],
          providers: Graph.createGraphProviders({ graphThemeDefinitions: [definition] }),
        },
      ],
    });
    const coreStyle = defineTheme({ name: definition.name, resolve: () => ({}) });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        theme: { name: definition.name, mode: 'light' },
        children: [
          Graph.EntitySchema.parse({
            namespace: 'graph',
            type: 'entity',
            role: 'activity',
            position: [0, 0],
            style: { color: '#336699' },
          }),
        ],
      },
      { ...definitions, themeDefinitions: [coreStyle], padding: 0 },
    );

    expect(JSON.stringify(output.scene)).toContain('#d6e0eb');
    expect(JSON.stringify(output.scene)).not.toContain('"fill":0.2');
  });

  it('按 Relation -> label / marker 主色链解析 Graph Theme 数值 token', () => {
    const definition = Graph.defineGraphTheme({
      name: 'contextual-relation',
      resolve: () => ({
        defaults: {
          relation: {
            style: {
              color: '#336699',
              stroke: 0.2,
            },
            labelTextForeground: 0.6,
            targetMarker: { color: 0.8, fill: 0.25 },
          },
        },
      }),
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        {
          roots: [Graph.RelationProviderKey],
          providers: Graph.createGraphProviders({ graphThemeDefinitions: [definition] }),
        },
      ],
    });
    const coreStyle = defineTheme({ name: definition.name, resolve: () => ({}) });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        theme: { name: definition.name, mode: 'light' },
        children: [
          { type: 'node', id: 'source', position: [0, 0] },
          { type: 'node', id: 'target', position: [80, 0] },
          Graph.RelationSchema.parse({
            namespace: 'graph',
            type: 'relation',
            source: { id: 'source' },
            target: { id: 'target' },
            role: 'generalization',
            labels: [{ text: 'edge' }],
          }),
        ],
      },
      { ...definitions, themeDefinitions: [coreStyle], padding: 0 },
    );
    const scene = JSON.stringify(output.scene);

    expect(scene).toContain('#d6e0eb');
    expect(scene).toContain('#85a3c2');
    expect(scene).toContain('#ccd9e6');
  });

  it('通过发出的 Scope 编译 Graph Core 主题/默认通道和 Graph 规则', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.GraphProviderKey], providers: Graph.createGraphProviders() }],
    });
    const warnings: Array<CompileWarning> = [];
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          Graph.GraphSchema.parse({
            namespace: 'graph',
            type: 'graph',
            theme: { mode: 'dark' },
            graphRules: [
              { type: 'entity', style: { fill: '#ef4444' } },
              { type: 'relation', style: { stroke: '#22c55e' } },
            ],
            children: [
              {
                namespace: 'graph',
                type: 'entity',
                id: 'source',
                role: 'activity',
                position: [0, 0],
                text: 'A',
                label: { text: 'source label', position: 'top' },
              },
              { namespace: 'graph', type: 'entity', id: 'target', role: 'activity', position: [100, 0], text: 'B' },
              {
                namespace: 'graph',
                type: 'relation',
                id: 'edge',
                source: { id: 'source' },
                target: { id: 'target' },
                role: 'dependency',
                labels: [{ text: 'link', position: 0.5 }],
              },
            ],
            defaults: {
              node: { style: { dashed: true }, label: { font: { size: 11 } } },
              path: { style: { lineCap: 'round' }, label: { font: { size: 11 } }, arrow: { length: 12 } },
            },
          }),
        ],
      },
      { ...definitions, padding: 0, onWarn: warning => warnings.push(warning) },
    );
    const scene = JSON.stringify(output.scene);

    expect(scene).toContain('#ef4444');
    expect(scene).toContain('#22c55e');
    expect(scene).toContain('dashPattern');
    expect(scene).toContain('round');
    expect(scene).toContain('11');
    expect(scene).toContain('12');
    expect(warnings).toEqual([]);
  });

  it('尊重 Graph 上的 Core 重置，同时保留 Graph 作者默认值', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.GraphProviderKey], providers: Graph.createGraphProviders() }],
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          {
            type: 'scope',
            children: [
              {
                namespace: 'graph',
                type: 'graph',
                children: [{ namespace: 'graph', type: 'entity', role: 'activity', position: [0, 0], text: 'reset' }],
                defaultGraph: { entity: { style: { fill: '#ef4444' } } },
                defaults: { reset: ['node'] },
              },
            ],
            defaults: {
              node: {
                style: { dashed: true },
              },
            },
          },
        ],
      },
      { ...definitions, padding: 0 },
    );

    const scene = JSON.stringify(output.scene);

    expect(scene).not.toContain('dashPattern');
    expect(scene).toContain('#ef4444');
  });

  it('填充模式感知默认预设中省略的 Entity 样式字段', () => {
    const definition = Graph.defineGraphTheme({
      name: 'entity-color-only',
      resolve: () => ({ defaults: { entity: { style: { color: '#2563eb' } } } }),
    });
    const theme = themeWithName(definition.name);
    const defaults = Graph.getDefaultGraphThemePreset(theme);
    const resolved = Graph.resolveGraphTheme(theme, styleRegistry(definition));

    expect(resolved.defaults.entity?.style).toEqual({ ...defaults.defaults.entity?.style, color: '#2563eb' });
    expect(resolved.defaults.relation).toEqual(defaults.defaults.relation);
    expect(resolved.defaults.group).toEqual(defaults.defaults.group);
    expect(resolved.defaults.block).toEqual(defaults.defaults.block);
    expect(resolved.rules).toEqual(defaults.rules);
  });

  it('填充模式感知默认预设中省略的 Relation 样式字段', () => {
    const definition = Graph.defineGraphTheme({
      name: 'relation-stroke-only',
      resolve: () => ({ defaults: { relation: { style: { stroke: '#16a34a' } } } }),
    });
    const theme = themeWithName(definition.name);
    const defaults = Graph.getDefaultGraphThemePreset(theme);
    const resolved = Graph.resolveGraphTheme(theme, styleRegistry(definition));

    expect(resolved.defaults.entity).toEqual(defaults.defaults.entity);
    expect(resolved.defaults.relation).toEqual({
      ...defaults.defaults.relation,
      style: { ...defaults.defaults.relation?.style, stroke: '#16a34a' },
    });
    expect(resolved.defaults.group).toEqual(defaults.defaults.group);
    expect(resolved.defaults.block).toEqual(defaults.defaults.block);
    expect(resolved.rules).toEqual(defaults.rules);
  });

  it('填充中性预设中省略的 Group 和 Block 外壳字段', () => {
    const definition = Graph.defineGraphTheme({
      name: 'container-shells',
      resolve: () => ({
        defaults: {
          group: { cornerRadius: 2 },
          block: { background: { fill: '#f8fafc', opacity: { fill: 0.75 } } },
        },
      }),
    });
    const theme = themeWithName(definition.name);
    const defaults = Graph.getDefaultGraphThemePreset(theme);
    const resolved = Graph.resolveGraphTheme(theme, styleRegistry(definition));

    expect(resolved.defaults.entity).toEqual(defaults.defaults.entity);
    expect(resolved.defaults.relation).toEqual(defaults.defaults.relation);
    expect(resolved.defaults.group).toEqual({ ...defaults.defaults.group, cornerRadius: 2 });
    expect(resolved.defaults.block).toEqual({
      ...defaults.defaults.block,
      background: { fill: '#f8fafc', opacity: { fill: 0.75 } },
    });
    expect(resolved.rules).toEqual(defaults.rules);
  });

  it('当自定义样式提供空规则列表时，保持中性基线', () => {
    const definition = Graph.defineGraphTheme({
      name: 'empty-rule-list',
      resolve: () => ({ rules: [] }),
    });
    const theme = themeWithName(definition.name);
    const defaults = Graph.getDefaultGraphThemePreset(theme);

    expect(Graph.resolveGraphTheme(theme, styleRegistry(definition)).rules).toEqual(defaults.rules);
  });

  it('通过语义选择器应用自定义 Entity 规则，无需可视选择器键', () => {
    const definition = Graph.defineGraphTheme({
      name: 'fill-rule-override',
      resolve: () => ({
        rules: [
          {
            type: Graph.GraphType.Entity,
            selector: { role: Graph.BuiltinEntityRole.Activity },
            style: { fill: '#f97316' },
          },
        ],
      }),
    });
    const theme = themeWithName(definition.name);
    const options = Graph.resolveGraphDefinitionOptions({ graphThemeDefinitions: [definition] });
    const entity = Graph.resolveEntity(
      Graph.EntitySchema.parse({
        namespace: Graph.GRAPH_NAMESPACE,
        type: Graph.GraphType.Entity,
        role: Graph.BuiltinEntityRole.Activity,
      }),
      options,
    );

    expect(Graph.resolveEntityAppearance(entity, { ...options, theme })).toMatchObject({
      style: { fill: '#f97316', stroke: 1 },
    });
  });

  it('接受显式空样式默认片段作为不覆盖', () => {
    const definition = Graph.defineGraphTheme({
      name: 'empty-entity-defaults',
      resolve: () => ({ defaults: { entity: { style: {} } } }),
    });

    const theme = themeWithName(definition.name);
    const baseline = Graph.getDefaultGraphThemePreset(theme);

    expect(Graph.resolveGraphTheme(theme, styleRegistry(definition))).toEqual(baseline);
  });

  it.each(['group', 'block'] as const)('接受显式空的 %s 默认值，因为不覆盖', member => {
    const definition = {
      name: `empty-${member}-defaults`,
      resolve: () => ({ defaults: { [member]: {} } }),
    };
    const theme = themeWithName(definition.name);
    const baseline = Graph.getDefaultGraphThemePreset(theme);

    expect(Graph.resolveGraphTheme(theme, new Map([[definition.name, definition]])).defaults[member]).toEqual(
      baseline.defaults[member],
    );
  });

  it('包装 Graph 主题回调异常而不替换其原因', () => {
    const cause = new Error('custom style failed');
    const definition = Graph.defineGraphTheme({
      name: 'throwing-style',
      resolve: () => {
        throw cause;
      },
    });

    try {
      Graph.resolveGraphTheme(themeWithName(definition.name), styleRegistry(definition));
      throw new Error('Expected Graph Theme callback to fail.');
    } catch (error) {
      expect(error).toMatchObject({
        code: Graph.RetikzGraphErrorCode.DefinitionCallbackFailed,
        details: { capability: 'graph-theme', key: definition.name },
        cause,
      });
    }
  });

  it('通过所属模块 schema 投影 Graph 主题对象输出', () => {
    class EntityStyleOutput {
      readonly color = '#2563eb';
    }

    const getterOutput = Object.defineProperty({}, 'entity', {
      enumerable: true,
      get: () => ({ style: { color: '#2563eb' } }),
    });
    const symbolOutput = { defaults: { entity: { style: { color: '#2563eb' } } }, [Symbol('metadata')]: true };
    const definitions: Array<Graph.GraphThemeDefinition> = [
      Graph.defineGraphTheme({
        name: 'class-style',
        resolve: () => ({ defaults: { entity: { style: new EntityStyleOutput() } } }),
      }),
      Graph.defineGraphTheme({ name: 'getter-output', resolve: () => ({ defaults: getterOutput }) }),
      Graph.defineGraphTheme({ name: 'symbol-output', resolve: () => symbolOutput }),
    ];

    for (const definition of definitions) {
      expect(
        Graph.resolveGraphTheme(themeWithName(definition.name), new Map([[definition.name, definition]])).defaults
          .entity?.style?.color,
        definition.name,
      ).toBe('#2563eb');
    }
  });

  it('在所属模块合并期间忽略显式 undefined 的 Graph 样式字段', () => {
    const style = { color: undefined };
    const definition = { name: 'undefined-style-field', resolve: () => ({ defaults: { entity: { style } } }) };
    const theme = themeWithName(definition.name);

    expect(Graph.resolveGraphTheme(theme, styleRegistry(definition)).defaults.entity?.style?.color).toBe(
      Graph.getDefaultGraphThemePreset(theme).defaults.entity?.style?.color,
    );
  });

  it('在所属模块合并期间忽略显式 undefined 的 Group shell 字段', () => {
    const defaults = { cornerRadius: undefined };
    const definition = { name: 'undefined-group-field', resolve: () => ({ defaults: { group: defaults } }) };
    const theme = themeWithName(definition.name);

    expect(Graph.resolveGraphTheme(theme, styleRegistry(definition)).defaults.group?.cornerRadius).toBe(
      Graph.getDefaultGraphThemePreset(theme).defaults.group?.cornerRadius,
    );
  });

  it('保持未注册的 Graph 主题诊断不变', () => {
    try {
      Graph.resolveGraphTheme(themeWithName('missing-style'), new Map());
      throw new Error('Expected Graph Theme lookup to fail.');
    } catch (error) {
      expect(error).toMatchObject({
        code: Graph.RetikzGraphErrorCode.DefinitionNotRegistered,
        details: { capability: 'graph-theme', key: 'missing-style' },
      });
    }
  });
});

it('Graph 样式图层独立继承不透明度因子', () => {
  const merged = Graph.mergeGraphDefaults(
    {
      entity: { style: { opacity: { fill: 0.4, stroke: 0.8 } } },
      relation: { style: { opacity: { stroke: 0.6 } } },
    },
    {
      entity: { style: { opacity: 0.5 } },
      relation: { style: { opacity: { overall: 0 } } },
    },
  );
  expect(merged?.entity?.style?.opacity).toEqual({ overall: 0.5, fill: 0.4, stroke: 0.8 });
  expect(merged?.relation?.style?.opacity).toEqual({ overall: 0, stroke: 0.6 });
});
