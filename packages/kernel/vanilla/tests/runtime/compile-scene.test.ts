import type { IRNode, IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite, defineTheme, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, string } from 'zod';

import { scene as inputScene, compileToScene } from '../../src';

describe('compileToScene 场景与编译结果', () => {
  it('Vanilla 与直接 JSON 在 Dark Theme 下解析相同 contextual color', () => {
    const theme = { mode: ThemeMode.Dark } as const;
    const child: IRNode = {
      type: 'node',
      position: [0, 0],
      style: { color: '#336699', fill: 0.2 },
    };
    const vanilla = compileToScene(inputScene({ theme, children: [child] }), {});
    const direct = compileToScene({ type: 'scene', version: 1, theme, children: [child] }, {});

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
      compile: (_node, context) => ({
        children: [
          {
            type: 'node',
            position: [0, 0],
            style: {
              fill: context.theme.name === 'academic' && context.theme.mode === ThemeMode.Dark ? '#123456' : '#abcdef',
            },
          },
        ],
      }),
    });
    const theme = { name: 'academic', mode: ThemeMode.Dark };
    const themeName = defineTheme({
      name: 'academic',
      resolve: () => ({
        semantic: { error: '#aa0000', success: '#00aa00', warning: '#aaaa00', guide: '#666666' },
        categorical: ['#112233'],
      }),
    });
    const child = { namespace: 'theme-test', type: 'box' } as const;
    const vanilla = compileToScene(inputScene({ theme, children: [child] }), {
      compile: { composites: [definition], themeDefinitions: [themeName] },
    });
    const direct = compileToScene(
      { type: 'scene', version: 1, theme, children: [child] },
      {
        compile: { composites: [definition], themeDefinitions: [themeName] },
      },
    );

    expect(vanilla.scene).toEqual(direct.scene);
    expect(JSON.stringify(vanilla.scene)).not.toContain('theme');
  });

  it('同次返回 Composite artifacts', () => {
    const marker = defineComposite({
      namespace: 'test',
      type: 'marker',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('marker'), label: string() }),
      artifactSchema: string(),
      compile: input => ({ children: [{ type: 'node', id: input.label, position: [0, 0] }], artifact: input.label }),
    });
    const ir: IRScene = { version: 1, type: 'scene', children: [{ namespace: 'test', type: 'marker', label: 'a' }] };
    const compiled = compileToScene(ir, { compile: { composites: [marker] } });
    expect(compiled.artifacts).toMatchObject([
      { namespace: 'test', type: 'marker', occurrence: { sourcePath: ['children', 0], expansionPath: [] }, value: 'a' },
    ]);
    expect(Object.isFrozen(compiled.artifacts)).toBe(true);
  });
});
