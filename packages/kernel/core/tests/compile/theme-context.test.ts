import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type { IRChild, IRScene, CanonicalTheme } from '../../src';
import { compileToScene, CompositeBaseSchema, defineComposite, defineTheme, ThemeMode } from '../../src';

const sceneOf = (children: Array<IRChild>, theme?: IRScene['theme']): IRScene => ({
  type: 'scene',
  version: 1,
  ...(theme === undefined ? {} : { theme }),
  children,
});

const createProbe = (observed: Array<CanonicalTheme>) =>
  defineComposite({
    namespace: 'theme-test',
    type: 'probe',
    schema: CompositeBaseSchema.extend({ namespace: literal('theme-test'), type: literal('probe') }),
    compile: (_node, context) => {
      observed.push(context.theme);
      return { children: [{ type: 'node', position: [0, 0] }] };
    },
  });

describe('主题编译上下文', () => {
  it('从 selector 生成没有 token bag 的完整共享 Theme', () => {
    const observed: Array<CanonicalTheme> = [];
    compileToScene(sceneOf([{ namespace: 'theme-test', type: 'probe' }], { mode: ThemeMode.Light }), {
      composites: [createProbe(observed)],
    });

    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({
      mode: ThemeMode.Light,
      colors: {
        categorical: expect.arrayContaining(['hsl(210, 38%, 48%)', 'hsl(30, 78%, 55%)', 'hsl(150, 36%, 48%)']),
      },
    });
    expect(observed[0]).not.toHaveProperty('tokens');
    expect(Object.isFrozen(observed[0])).toBe(true);
  });

  it('按字段继承 Scene 和 Scope selector', () => {
    const observed: Array<CanonicalTheme> = [];
    compileToScene(
      sceneOf(
        [{ type: 'scope', theme: { mode: ThemeMode.Light }, children: [{ namespace: 'theme-test', type: 'probe' }] }],
        { mode: ThemeMode.Dark },
      ),
      { composites: [createProbe(observed)] },
    );

    expect(observed[0]).toMatchObject({ mode: 'light' });
    expect(observed[0]).not.toHaveProperty('style');
  });

  it('通过同一 Core style registry 解析自定义 style', () => {
    const observed: Array<CanonicalTheme> = [];
    const brand = defineTheme({
      name: 'brand',
      resolve: ({ mode }) => ({
        semantic: {
          error: mode === ThemeMode.Dark ? '#ffaaaa' : '#aa0000',
          success: mode === ThemeMode.Dark ? '#aaffaa' : '#00aa00',
          warning: mode === ThemeMode.Dark ? '#ffffaa' : '#aaaa00',
          guide: mode === ThemeMode.Dark ? '#cccccc' : '#666666',
        },
        categorical: mode === ThemeMode.Dark ? ['#aabbcc'] : ['#112233'],
      }),
    });

    compileToScene(sceneOf([{ namespace: 'theme-test', type: 'probe' }], { name: 'brand', mode: ThemeMode.Dark }), {
      composites: [createProbe(observed)],
      themeDefinitions: [brand],
    });

    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({
      name: 'brand',
      mode: ThemeMode.Dark,
      colors: { categorical: ['#aabbcc'], semantic: { error: '#ffaaaa', guide: '#cccccc' } },
    });
  });
});
