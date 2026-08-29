import type { IRNode, IRScene, Scene } from '@retikz/core';

import { CompositeBaseSchema, defineComposite, defineThemeStyle, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { scene as inputScene, toSceneResult } from '../../src';

const scene: Scene = {
  layout: { x: 0, y: 0, width: 1, height: 1 },
  primitives: [],
};

describe('toSceneResult runtime metadata', () => {
  it('Vanilla 与直接 JSON 在 Dark Theme 下解析相同 contextual color', () => {
    const theme = { mode: ThemeMode.Dark } as const;
    const child: IRNode = {
      type: 'node',
      position: [0, 0],
      color: '#336699',
      fill: 0.2,
    };
    const vanilla = toSceneResult(inputScene({ theme, children: [child] }), {});
    const direct = toSceneResult({ type: 'scene', version: 1, theme, children: [child] }, {});

    expect(vanilla.scene).toEqual(direct.scene);
    expect(JSON.stringify(vanilla.scene)).toContain('#0a141f');
    expect(JSON.stringify(vanilla.scene)).not.toContain('"fill":0.2');
  });

  it('Vanilla Figure Theme 与直接 Core IR得到同一已物化 Scene', () => {
    const definition = defineComposite({
      namespace: 'theme-test',
      type: 'box',
      schema: CompositeBaseSchema.extend({
        namespace: literal('theme-test'),
        type: literal('box'),
      }),
      expand: (_node, context) => ({
        children: [
          {
            type: 'node',
            position: [0, 0],
            fill: context.theme.style === 'academic' && context.theme.mode === ThemeMode.Dark ? '#123456' : '#abcdef',
          },
        ],
      }),
    });
    const theme = { style: 'academic', mode: ThemeMode.Dark };
    const themeStyle = defineThemeStyle({
      name: 'academic',
      resolve: () => ({
        semantic: { error: '#aa0000', success: '#00aa00', warning: '#aaaa00', guide: '#666666' },
        categorical: ['#112233'],
      }),
    });
    const child = { namespace: 'theme-test', type: 'box' } as const;
    const vanilla = toSceneResult(inputScene({ theme, children: [child] }), {
      compile: { composites: [definition], themeStyles: [themeStyle] },
    });
    const direct = toSceneResult(
      { type: 'scene', version: 1, theme, children: [child] },
      {
        compile: { composites: [definition], themeStyles: [themeStyle] },
      },
    );

    expect(vanilla.scene).toEqual(direct.scene);
    expect(JSON.stringify(vanilla.scene)).not.toContain('theme');
  });
  it('为不同 Scene 输入结果创建互不共享的空 metadata', () => {
    const first = toSceneResult(scene, {});
    const second = toSceneResult(scene, {});

    expect(first.compileResult).toBeUndefined();
    expect(Object.hasOwn(first, 'compileResult')).toBe(true);
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

  it('预编译 Scene 使用编译驱动时 fail-loud，不从 Scene 反推 authored sites', () => {
    expect(() =>
      toSceneResult(scene, {
        compileDriver: {
          create: () => ({ observers: [], resolve: output => output as never }),
        },
      }),
    ).toThrow('Vanilla compile drivers require authored IR or an InputScene');
  });
});
