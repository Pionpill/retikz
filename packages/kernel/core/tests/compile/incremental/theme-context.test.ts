import {
  createRuntimeSourceInput,
  createRuntimeSourceRegistry,
  createRuntimeSourceUpdate,
  createRuntimeComputationRegistry,
  createRuntime,
  RuntimeComputationKind,
} from '@retikz/runtime';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type { IRScene } from '../../../src';
import {
  compileToScene,
  CompositeBaseSchema,
  CoreSourceDefinition,
  createCoreComputation,
  defineComposite,
  ThemeMode,
} from '../../../src';

const themedComposite = defineComposite({
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
        id: 'box',
        position: [0, 0],
        style: { fill: context.theme.mode === ThemeMode.Dark ? '#111111' : '#eeeeee' },
      },
    ],
  }),
});

const runUpdate = (initial: IRScene, next: IRScene) => {
  const options = { composites: [themedComposite], onWarn: () => {} } as const;
  const program = createCoreComputation(options);
  const sources = createRuntimeSourceRegistry({ builtins: [CoreSourceDefinition] });
  const computations = createRuntimeComputationRegistry({ sources, builtins: [program] });
  const session = createRuntime({
    sources,
    computations,
    initialSnapshots: [createRuntimeSourceInput(CoreSourceDefinition, initial)],
  });
  const result = session.update({
    baseRevision: session.revision(),
    sources: [createRuntimeSourceUpdate(CoreSourceDefinition, next)],
  });
  return { result, actual: session.artifact(program).value.output.result, expected: compileToScene(next, options) };
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

    expect(update.result.outcome).toBe(RuntimeComputationKind.Fallback);
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

    expect(update.result.outcome).toBe(RuntimeComputationKind.Fallback);
    expect(update.actual).toEqual(update.expected);
  });
});
