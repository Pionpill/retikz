import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
} from '@retikz/runtime';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRScene } from '../../../src';

import {
  compileToScene,
  CompositeBaseSchema,
  CoreOwnerDefinition,
  createCoreProgram,
  defineComposite,
  ThemeMode,
  ThemeStyle,
} from '../../../src';

const themedComposite = defineComposite({
  namespace: 'theme-test',
  type: 'box',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('theme-test'),
    type: z.literal('box'),
  }),
  expand: (_node, context) => ({
    type: 'node',
    id: 'box',
    position: [0, 0],
    fill: context.theme.mode === ThemeMode.Dark ? '#111111' : '#eeeeee',
  }),
});

const runUpdate = (initial: IRScene, next: IRScene) => {
  const options = { composites: [themedComposite], onWarn: () => {} } as const;
  const program = createCoreProgram(options);
  const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
  const session = createRuntimeSession({
    owners,
    programs,
    initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, initial)],
  });
  const result = session.update({
    baseRevision: session.revision(),
    owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
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

    expect(update.result.outcome).toBe('fallback');
    expect(update.actual).toEqual(update.expected);
  });

  it('Scope Theme变化保守 full fallback且与 fresh compile等价', () => {
    const initial: IRScene = {
      type: 'scene',
      version: 1,
      theme: { style: ThemeStyle.Academic },
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

    expect(update.result.outcome).toBe('fallback');
    expect(update.actual).toEqual(update.expected);
  });
});
