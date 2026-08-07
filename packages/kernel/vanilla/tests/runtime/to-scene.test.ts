import type { IRScene, Scene } from '@retikz/core';

import { CompositeBaseSchema, defineComposite, defineThemeTokenNamespace, ThemeMode, ThemeStyle } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { VanillaTier2Adapter } from '../../src';

import { toSceneResult } from '../../src/runtime/to-scene';
import { embed, figure } from '../../src/spec';

const scene: Scene = {
  layout: { x: 0, y: 0, width: 1, height: 1 },
  primitives: [],
};

describe('toSceneResult runtime metadata', () => {
  it('plain spec embed 自动贡献 Theme definition，并与 standalone 显式 definition 走同一 Core compile', () => {
    const definition = defineThemeTokenNamespace({
      namespace: 'vanilla-theme',
      schema: z.strictObject({ 'surface.fill': z.string() }),
    });
    const composite = defineComposite({
      namespace: 'vanilla-theme',
      type: 'box',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('vanilla-theme'),
        type: z.literal('box'),
      }),
      expand: (_node, context) => {
        const fill = context.theme.tokens['vanilla-theme']['surface.fill'];
        if (typeof fill !== 'string') throw new Error('expected vanilla theme token');
        return { type: 'node', position: [0, 0], fill };
      },
    });
    const adapter: VanillaTier2Adapter = {
      kind: 'vanilla-theme',
      namespace: 'vanilla-theme',
      lower: () => ({
        node: { namespace: 'vanilla-theme', type: 'box' },
        datasets: {},
        makeComposites: () => [composite],
        themeTokenDefinitions: [definition],
      }),
    };
    const theme = { tokens: { 'vanilla-theme': { 'surface.fill': '#234567' } } } as const;
    const embedded = toSceneResult(figure({ theme, children: [embed('vanilla-theme', 'box', {})] }), {
      adapters: [adapter],
    });
    const standalone = toSceneResult(
      { type: 'scene', version: 1, theme, children: [{ namespace: 'vanilla-theme', type: 'box' }] },
      { compile: { composites: [composite], themeTokenDefinitions: [definition] } },
    );

    expect(embedded.scene).toEqual(standalone.scene);
    expect(embedded.scene.primitives).toContainEqual(expect.objectContaining({ fill: '#234567' }));
  });

  it('plain spec 的同 namespace 不同 definition identity 由 Core registry 统一诊断', () => {
    const first = defineThemeTokenNamespace({
      namespace: 'vanilla-conflict',
      schema: z.strictObject({ value: z.string().optional() }),
    });
    const second = defineThemeTokenNamespace({
      namespace: 'vanilla-conflict',
      schema: z.strictObject({ value: z.string().optional() }),
    });
    const makeComposites = () => [];
    const adapter = (kind: string, definition: typeof first): VanillaTier2Adapter => ({
      kind,
      namespace: 'vanilla-conflict',
      lower: () => ({
        node: { type: 'node', position: [0, 0] },
        datasets: {},
        makeComposites,
        themeTokenDefinitions: [definition],
      }),
    });

    expect(() =>
      toSceneResult(figure([embed('vanilla-first', 'first', {}), embed('vanilla-second', 'second', {})]), {
        adapters: [adapter('vanilla-first', first), adapter('vanilla-second', second)],
      }),
    ).toThrow(/vanilla-conflict.*conflict/i);
  });

  it('Vanilla Figure Theme 与直接 Core IR得到同一已物化 Scene', () => {
    const definition = defineComposite({
      namespace: 'theme-test',
      type: 'box',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('theme-test'),
        type: z.literal('box'),
      }),
      expand: (_node, context) => ({
        type: 'node',
        position: [0, 0],
        fill:
          context.theme.style === ThemeStyle.Academic && context.theme.mode === ThemeMode.Dark ? '#123456' : '#abcdef',
      }),
    });
    const theme = { style: ThemeStyle.Academic, mode: ThemeMode.Dark };
    const child = { namespace: 'theme-test', type: 'box' } as const;
    const vanilla = toSceneResult(figure({ theme, children: [child] }), {
      compile: { composites: [definition] },
    });
    const direct = toSceneResult(
      { type: 'scene', version: 1, theme, children: [child] },
      {
        compile: { composites: [definition] },
      },
    );

    expect(vanilla.scene).toEqual(direct.scene);
    expect(JSON.stringify(vanilla.scene)).not.toContain('theme');
  });
  it('为不同 Scene 输入结果创建互不共享的空 metadata', () => {
    const first = toSceneResult(scene, {});
    const second = toSceneResult(scene, {});

    expect(first.runtimeMeta).not.toBe(second.runtimeMeta);
    expect(first.runtimeMeta.layers).not.toBe(second.runtimeMeta.layers);
    expect(first.runtimeMeta.identityIndex).not.toBe(second.runtimeMeta.identityIndex);
    expect(first.runtimeMeta.parentIndex).not.toBe(second.runtimeMeta.parentIndex);
  });

  it('同次返回 compile artifacts，Scene 输入固定为空 immutable 数组', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'a', position: [0, 0], text: 'A' }],
    };

    const compiled = toSceneResult(ir, { compile: { artifacts: { nodeLayouts: true } } });
    const passedScene = toSceneResult(scene, { compile: { artifacts: { nodeLayouts: true } } });

    expect(compiled.artifacts).toMatchObject([
      {
        kind: 'nodeLayout',
        occurrence: { sourcePath: 'children[0].node', expansionPath: [] },
        value: { id: 'a' },
      },
    ]);
    expect(Object.isFrozen(compiled.artifacts)).toBe(true);
    expect(passedScene.artifacts).toEqual([]);
    expect(Object.isFrozen(passedScene.artifacts)).toBe(true);
  });

  it('预编译 Scene 开启 inspector 时 fail-loud，不从 Scene 反推布局', () => {
    expect(() => toSceneResult(scene, { inspect: { layout: true } })).toThrow(
      'Vanilla Layout Inspector cannot run from a precompiled Scene.',
    );
  });
});
