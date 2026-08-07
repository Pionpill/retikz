import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  RuntimeProgramKind,
} from '@retikz/runtime';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { AnyThemeTokenDefinition, IRScene } from '../../../src';

import {
  compileToScene,
  CompositeBaseSchema,
  CoreOwnerDefinition,
  createCoreProgram,
  defineComposite,
  defineThemeTokenNamespace,
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

const themeTokenDefinition = defineThemeTokenNamespace({
  namespace: 'theme-token-retained',
  schema: z.strictObject({ fill: z.string().optional() }),
});

const tokenThemedComposite = defineComposite({
  namespace: 'theme-token-retained',
  type: 'box',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('theme-token-retained'),
    type: z.literal('box'),
  }),
  expand: (_node, context) => {
    const fill = context.theme.tokens['theme-token-retained'].fill;
    return {
      type: 'node',
      id: 'token-box',
      position: [0, 0],
      fill: typeof fill === 'string' ? fill : '#eeeeee',
    };
  },
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

const runTokenUpdate = (initial: IRScene, next: IRScene) => {
  const options = {
    composites: [tokenThemedComposite],
    themeTokenDefinitions: [themeTokenDefinition],
    onWarn: () => {},
  } as const;
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
  it('Program 快照 themeTokenDefinitions 数组并保留 frozen definition/schema identity', () => {
    const definitions: Array<AnyThemeTokenDefinition> = [themeTokenDefinition];
    const options = {
      composites: [tokenThemedComposite],
      themeTokenDefinitions: definitions,
      onWarn: () => {},
    } as const;
    const program = createCoreProgram(options);
    const incompatible = defineThemeTokenNamespace({
      namespace: 'theme-token-retained',
      schema: z.strictObject({ fill: z.number().optional() }),
    });
    definitions.splice(0, 1, incompatible);
    const ir: IRScene = {
      type: 'scene',
      version: 1,
      theme: { tokens: { 'theme-token-retained': { fill: '#123456' } } },
      children: [{ namespace: 'theme-token-retained', type: 'box' }],
    };
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, ir)],
    });

    expect(session.artifact(program).value.output.result).toEqual(
      compileToScene(ir, {
        composites: [tokenThemedComposite],
        themeTokenDefinitions: [themeTokenDefinition],
        onWarn: options.onWarn,
      }),
    );
    expect(Object.isFrozen(themeTokenDefinition)).toBe(true);
    expect(themeTokenDefinition.schema).not.toBe(incompatible.schema);
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

    expect(update.result.outcome).toBe(RuntimeProgramKind.Fallback);
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

    expect(update.result.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(update.actual).toEqual(update.expected);
  });

  it('Scene token 变化保守 full fallback，且 Scene tokens 与 fresh compile 等价', () => {
    const initial: IRScene = {
      type: 'scene',
      version: 1,
      theme: { tokens: { 'theme-token-retained': { fill: '#111111' } } },
      children: [{ namespace: 'theme-token-retained', type: 'box' }],
    };
    const next: IRScene = {
      ...initial,
      theme: { tokens: { 'theme-token-retained': { fill: '#222222' } } },
    };

    const update = runTokenUpdate(initial, next);

    expect(update.result.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(update.actual).toEqual(update.expected);
  });

  it('Scope token 变化保守 full fallback，且 Scope tokens 与 fresh compile 等价', () => {
    const initial: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          id: 'token-scope',
          theme: { tokens: { 'theme-token-retained': { fill: '#111111' } } },
          children: [{ namespace: 'theme-token-retained', type: 'box' }],
        },
      ],
    };
    const next: IRScene = {
      ...initial,
      children: [
        {
          ...initial.children[0],
          theme: { tokens: { 'theme-token-retained': { fill: '#222222' } } },
        },
      ],
    };

    const update = runTokenUpdate(initial, next);

    expect(update.result.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(update.actual).toEqual(update.expected);
  });
});
