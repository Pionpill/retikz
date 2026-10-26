import {
  compileToScene,
  resolveCoreProviderDependencies,
  resolveDefaultCoreThemeColors,
  ThemeMode,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';
import { primitivesOf } from './test-utils';

const theme = {
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
} as const;

const entity = (input: Record<string, unknown> = {}) =>
  Graph.EntitySchema.parse({
    namespace: 'graph',
    type: 'entity',
    role: 'participant',
    position: [20, 30],
    ...input,
  });

describe('Entity 下降', () => {
  it.each(['IR', 'Source IR\nCanonical IR'])('%s 的资源端帽与活动边界保持对齐', text => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.EntityProviderKey], providers: Graph.createGraphProviders() }],
    });
    const boundsOf = (role: string) =>
      compileToScene({ type: 'scene', version: 1, children: [entity({ role, text })] }, { ...definitions, padding: 0 })
        .scene.layout;
    const activity = boundsOf('activity');
    const resource = boundsOf('resource');

    expect(resource.y).toBeCloseTo(activity.y);
    expect(resource.height).toBeCloseTo(activity.height);
  });

  it('layout 分组保留 role 独占 padding 的限制', () => {
    expect(
      Graph.EntitySchema.safeParse({ namespace: 'graph', type: 'entity', role: 'participant', layout: { padding: 1 } })
        .success,
    ).toBe(false);
    expect(
      Graph.EntitySchema.safeParse({
        namespace: 'graph',
        type: 'entity',
        role: 'participant',
        layout: { minimumSize: 0 },
        style: { opacity: 0 },
      }).success,
    ).toBe(true);
  });

  it('将 1 个独立的 Entity 解析并下沉为 1 个 Core Node', () => {
    const options = Graph.resolveGraphDefinitionOptions();
    const canonical = Graph.resolveEntity(
      entity({
        id: 'service',
        text: 'API',
        layout: { minimumSize: { width: 80, height: 20 } },
      }),
      options,
    );
    const appearance = Graph.resolveEntityAppearance(canonical, { ...options, theme });

    expect(Graph.lowerEntity(canonical, appearance)).toEqual({
      type: 'node',
      id: 'service',
      position: [20, 30],
      text: 'API',
      shape: { type: 'hexagon' },
      layout: { padding: { x: 0, y: 8 }, minimumSize: { width: 80, height: 36 } },
      style: {
        color: '#777777',
        textColor: 'contrast',
        fill: 0.12,
        stroke: 1,
        strokeWidth: 1,
        opacity: { fill: 1, stroke: 1, overall: 1 },
      },
    });
  });

  it('编译直接 Entity Scene 子级并保留省略的 id', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.EntityProviderKey], providers: Graph.createGraphProviders() }],
    });
    const output = compileToScene(
      { type: 'scene', version: 1, children: [entity({ role: 'activity', text: 'work' })] },
      { ...definitions, padding: 0 },
    );
    const primitives = primitivesOf(output.scene.primitives);

    expect(primitives.length).toBeGreaterThan(0);
    expect(primitives.some(primitive => 'id' in primitive)).toBe(false);
    expect(JSON.stringify(output.scene)).not.toContain('dashPattern');
  });

  it.each([
    { status: 'error', color: theme.colors.semantic.error, dashPattern: undefined },
    { status: 'success', color: theme.colors.semantic.success, dashPattern: undefined },
    { status: 'warning', color: theme.colors.semantic.warning, dashPattern: undefined },
    { status: 'disabled', color: theme.colors.semantic.guide, dashPattern: [6, 4] },
  ] as const)(
    '将中性 $status 状态解析为 Core 语义 Entity 外观系列',
    ({ status, color, dashPattern }) => {
      const options = Graph.resolveGraphDefinitionOptions();
      const canonical = Graph.resolveEntity(entity({ status }), options);

      const appearance = Graph.resolveEntityAppearance(canonical, { ...options, theme });

      expect(appearance).toMatchObject({ style: { color } });
      expect(appearance.style?.dashPattern).toEqual(dashPattern);

      const lowered = Graph.lowerEntity(canonical, appearance);

      expect(lowered.style?.dashPattern).toEqual(dashPattern);
      expect(lowered).not.toHaveProperty('status');
    },
  );

  it('让 Graph 作者默认优先生成的语义状态颜色', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.GraphProviderKey], providers: Graph.createGraphProviders() }],
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          Graph.GraphSchema.parse({
            namespace: 'graph',
            type: 'graph',
            defaultGraph: { entity: { style: { color: '#7c3aed' } } },
            children: [
              {
                namespace: 'graph',
                type: 'entity',
                role: 'activity',
                status: 'error',
                position: [0, 0],
              },
            ],
          }),
        ],
      },
      { ...definitions, padding: 0 },
    );

    const scene = JSON.stringify(output.scene);

    expect(scene).toContain('#7c3aed');
    expect(scene).not.toContain(theme.colors.semantic.error);
  });

  it('让编写的 Entity 外观覆盖状态主题，同时保留语义状态', () => {
    const options = Graph.resolveGraphDefinitionOptions();
    const canonical = Graph.resolveEntity(
      entity({
        status: 'error',
        style: { color: '#7c3aed' },
      }),
      options,
    );

    expect(canonical.source).toMatchObject({ status: 'error' });
    expect(Graph.lowerEntity(canonical, Graph.resolveEntityAppearance(canonical, { ...options, theme }))).toMatchObject(
      {
        style: { color: '#7c3aed' },
      },
    );
  });

  it('仅在位置不存在时下沉失败，而不会发明 undefined 的身份', () => {
    const options = Graph.resolveGraphDefinitionOptions();
    const canonical = Graph.resolveEntity(entity({ role: 'activity', position: undefined }), options);

    expect(() =>
      Graph.lowerEntity(canonical, Graph.resolveEntityAppearance(canonical, { ...options, theme })),
    ).toThrowError(
      expect.objectContaining({
        code: Graph.RetikzGraphErrorCode.CompileInvariant,
        message: expect.not.stringContaining('undefined'),
      }),
    );
  });

  it('当自定义角色引用未注册的形状时，Core 形状注册表失败', () => {
    const customRole = Graph.defineEntityRole({
      role: 'custom',
      description: 'Custom shape owner',
      shape: 'missing-shape',
      padding: 4,
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        {
          roots: [Graph.EntityProviderKey],
          providers: Graph.createGraphProviders({ entityRoles: [customRole] }),
        },
      ],
    });

    expect(() =>
      compileToScene(
        { type: 'scene', version: 1, children: [entity({ id: 'custom', role: 'custom' })] },
        { ...definitions, padding: 0 },
      ),
    ).toThrow(/Unknown provider 'missing-shape'/);
  });
});
