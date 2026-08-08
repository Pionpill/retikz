import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRChild, IRScene, ResolvedTheme } from '../../src';

import { compileToScene, CompositeBaseSchema, defineComposite, defineThemeStyle, ThemeMode, ThemeStyle } from '../../src';

const sceneOf = (children: Array<IRChild>, theme?: IRScene['theme']): IRScene => ({
  type: 'scene',
  version: 1,
  ...(theme === undefined ? {} : { theme }),
  children,
});

const createProbe = (observed: Array<ResolvedTheme>) =>
  defineComposite({
    namespace: 'theme-test',
    type: 'probe',
    schema: CompositeBaseSchema.extend({ namespace: z.literal('theme-test'), type: z.literal('probe') }),
    expand: (_node, context) => {
      observed.push(context.theme);
      return { type: 'node', position: [0, 0] };
    },
  });

describe('Theme compile context', () => {
  it('从 selector 生成没有 token bag 的完整共享 Theme', () => {
    const observed: Array<ResolvedTheme> = [];
    compileToScene(
      sceneOf([{ namespace: 'theme-test', type: 'probe' }], {
        style: ThemeStyle.Academic,
        mode: ThemeMode.Light,
      }),
      { composites: [createProbe(observed)] },
    );

    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({
      style: ThemeStyle.Academic,
      mode: ThemeMode.Light,
      colors: { categorical: expect.arrayContaining(['#1d4ed8', '#4338ca', '#7e22ce']) },
    });
    expect(observed[0]).not.toHaveProperty('tokens');
    expect(Object.isFrozen(observed[0])).toBe(true);
  });

  it('按字段继承 Scene 和 Scope selector', () => {
    const observed: Array<ResolvedTheme> = [];
    compileToScene(
      sceneOf(
        [{ type: 'scope', theme: { mode: ThemeMode.Light }, children: [{ namespace: 'theme-test', type: 'probe' }] }],
        { style: ThemeStyle.Academic, mode: ThemeMode.Dark },
      ),
      { composites: [createProbe(observed)] },
    );

    expect(observed[0]).toMatchObject({ style: 'academic', mode: 'light' });
  });

  it('通过同一 Core style registry 解析自定义 style', () => {
    const observed: Array<ResolvedTheme> = [];
    const brand = defineThemeStyle({
      name: 'brand',
      resolve: ({ mode }) => ({
        semantic: {
          error: mode === ThemeMode.Dark ? '#ffaaaa' : '#aa0000',
          success: mode === ThemeMode.Dark ? '#aaffaa' : '#00aa00',
          warning: mode === ThemeMode.Dark ? '#ffffaa' : '#aaaa00',
        },
        categorical: mode === ThemeMode.Dark ? ['#aabbcc'] : ['#112233'],
      }),
    });

    compileToScene(
      sceneOf([{ namespace: 'theme-test', type: 'probe' }], { style: 'brand', mode: ThemeMode.Dark }),
      { composites: [createProbe(observed)], themeStyles: [brand] },
    );

    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({
      style: 'brand',
      mode: ThemeMode.Dark,
      colors: { categorical: ['#aabbcc'], semantic: { error: '#ffaaaa' } },
    });
  });
});
