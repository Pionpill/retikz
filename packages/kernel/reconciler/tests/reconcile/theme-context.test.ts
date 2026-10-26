import type { IRScene } from '@retikz/core';
import { compileToScene, CompositeBaseSchema, defineComposite, ThemeMode } from '@retikz/core';
import { ReconcilerSession } from '@retikz/reconciler';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

const themedComposite = defineComposite({
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
        id: 'box',
        position: [0, 0],
        style: { fill: context.theme.mode === ThemeMode.Dark ? '#111111' : '#eeeeee' },
      },
    ],
  }),
});

const runUpdate = (initial: IRScene, next: IRScene) => {
  const options = { composites: [themedComposite], onWarn: () => {} } as const;
  const session = new ReconcilerSession(options);
  session.mount(initial);
  const result = session.replace(next);

  return { result, actual: session.read().compilation.result, expected: compileToScene(next, options) };
};

describe('Theme retained invalidation', () => {
  it('主色更新与宿主重置后的箭头输出等价于完整编译', () => {
    const source = (color: string, reset: boolean): IRScene => ({
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          id: 'colors',
          defaults: { style: { color }, path: { arrow: { color: 'green' } } },
          children: [
            {
              type: 'scope',
              defaults: { reset },
              children: [
                {
                  type: 'path',
                  id: 'edge',
                  style: { stroke: 'black' },
                  arrow: { end: { color: 'orange' } },
                  children: [
                    { type: 'step', kind: 'move', to: [0, 0] },
                    { type: 'step', kind: 'line', to: [100, 0] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const session = new ReconcilerSession();
    session.mount(source('red', false));
    for (const next of [source('blue', false), source('blue', true)]) {
      session.replace(next);
      expect(session.read().compilation.result).toEqual(compileToScene(next));
    }
  });

  it('根 Theme变化保守 full fallback且与 fresh compile等价', () => {
    const initial: IRScene = {
      type: 'scene',
      version: 1,
      theme: { mode: ThemeMode.Light },
      children: [{ namespace: 'theme-test', type: 'box' }],
    };
    const next: IRScene = { ...initial, theme: { mode: ThemeMode.Dark } };

    const update = runUpdate(initial, next);

    expect(update.actual).toEqual(update.expected);
  });

  it('Scope Theme变化保守 full fallback且与 fresh compile等价', () => {
    const initial: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          id: 'themed-scope',
          theme: { mode: ThemeMode.Light },
          children: [{ namespace: 'theme-test', type: 'box' }],
        },
      ],
    };
    const next: IRScene = {
      ...initial,
      children: [{ ...initial.children[0], theme: { mode: ThemeMode.Dark } }],
    };

    const update = runUpdate(initial, next);

    expect(update.actual).toEqual(update.expected);
  });
});
