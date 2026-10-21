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
