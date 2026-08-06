import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type {
  CompileWarning,
  InspectionDiagnosticOrigin,
  IRAnimationTrack,
  IRChild,
  IRScene,
  ScenePrimitive,
} from '../../src';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  defineInspector,
  definePathKind,
  ThemeMode,
} from '../../src';

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

const flatten = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...flatten(primitive.children)] : [primitive],
  );

const compositeDefinition = (
  type: string,
  inspect: (
    artifact: { width: number },
    context: Parameters<ReturnType<typeof defineInspector>['inspect']>[1],
  ) => IRChild | ReadonlyArray<IRChild>,
) =>
  defineComposite({
    namespace: 'test',
    type,
    schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal(type) }),
    artifactSchema: z.strictObject({ width: z.number() }),
    inspector: defineInspector({
      kind: 'composite',
      optionsInputSchema: z.strictObject({ guides: z.boolean().optional() }),
      optionsSchema: z
        .strictObject({ guides: z.boolean().optional() })
        .transform(value => ({ guides: value.guides ?? true })),
      inspect,
    }),
    compile: () => ({
      children: [{ type: 'node', position: [0, 0], text: type }],
      artifact: { width: 40 },
    }),
  });

const selectedRoot = (index: number, self: boolean | Readonly<Record<string, unknown>> = true) => ({
  locator: { target: 'composite' as const, path: [{ kind: 'sceneChild' as const, index }] as const },
  tree: { policy: { self } },
});

const fade: IRAnimationTrack = {
  property: 'opacity',
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 1 },
  ],
  duration: 200,
};

const thrownBy = (callback: () => unknown): Error & Readonly<{ origin?: InspectionDiagnosticOrigin }> => {
  try {
    callback();
  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }
  throw new Error('Expected callback to throw.');
};

describe('extensible inspection compile channel', () => {
  it('keeps the channel at zero cost when no sidecar selects the Inspector', () => {
    const inspect = vi.fn(() => []);
    const definition = compositeDefinition('disabled', inspect);

    const result = compileToScene(scene([{ namespace: 'test', type: 'disabled' }]), {
      composites: [definition],
    });

    expect(inspect).not.toHaveBeenCalled();
    expect(result.inspection).toBeNull();
  });

  it('fails loudly when explicit self selects an unregistered Composite', () => {
    const error = thrownBy(() =>
      compileToScene(scene([{ namespace: 'missing', type: 'explicitTarget' }]), {
        inspection: { roots: [selectedRoot(0)] },
      }),
    );

    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'resolve',
      site: 'occurrence',
      owner: { kind: 'composite', namespace: 'missing', type: 'explicitTarget' },
      occurrence: { sourcePath: 'children[0]', expansionPath: [] },
    });
    expect(error.message).toMatch(/explicit composite inspection target has no inspector definition/i);
  });

  it('fails loudly when explicit self selects an expand-only Composite', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'expandOnly',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('expandOnly') }),
      expand: () => ({ type: 'coordinate', id: 'expanded', position: [0, 0] }),
    });
    const error = thrownBy(() =>
      compileToScene(scene([{ namespace: 'test', type: 'expandOnly' }]), {
        composites: [definition],
        inspection: { roots: [selectedRoot(0)] },
      }),
    );

    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'resolve',
      site: 'occurrence',
      owner: { kind: 'composite', namespace: 'test', type: 'expandOnly' },
      occurrence: { sourcePath: 'children[0]', expansionPath: [] },
    });
    expect(error.message).toMatch(/explicit composite inspection target has no inspector definition/i);
  });

  it('keeps the complete primary result and warning order unchanged when inspection is selected', () => {
    const definition = compositeDefinition('primaryParity', () => ({
      type: 'coordinate',
      id: 'auxiliary-only',
      position: [0, 0],
    }));
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'line', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      },
      { namespace: 'test', type: 'primaryParity' },
    ]);
    const withoutWarnings: Array<CompileWarning> = [];
    const withWarnings: Array<CompileWarning> = [];
    const withoutInspection = compileToScene(ir, {
      composites: [definition],
      onWarn: warning => withoutWarnings.push(warning),
    });
    const withInspection = compileToScene(ir, {
      composites: [definition],
      inspection: { roots: [selectedRoot(1)] },
      onWarn: warning => withWarnings.push(warning),
    });

    expect(withInspection.scene).toEqual(withoutInspection.scene);
    expect(withInspection.artifacts).toEqual(withoutInspection.artifacts);
    expect(withWarnings).toEqual(withoutWarnings);
    expect(withWarnings.map(warning => warning.origin)).toEqual([{ kind: 'primary' }]);
  });

  it('compiles final typed artifact output as an owner-scoped ordinary Scene', () => {
    const inspect = vi.fn((artifact: { width: number }, context) => {
      expect(context.options).toEqual({ guides: false });
      expect(context.appearance).toEqual({ colorScope: 0, scopeColor: '#2563eb', warningColor: '#dc2626' });
      return {
        type: 'path' as const,
        stroke: context.appearance.scopeColor,
        children: [
          { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
          { type: 'step' as const, kind: 'line' as const, to: [artifact.width, 0] as [number, number] },
        ],
      };
    });
    const definition = compositeDefinition('ordinaryScene', inspect);

    const result = compileToScene(scene([{ namespace: 'test', type: 'ordinaryScene' }]), {
      composites: [definition],
      inspection: { roots: [selectedRoot(0, { guides: false })] },
      padding: 0,
    });

    expect(inspect).toHaveBeenCalledTimes(1);
    expect(result.inspection?.entries).toHaveLength(1);
    const entry = result.inspection!.entries[0];
    expect(entry.owner).toEqual({ kind: 'composite', namespace: 'test', type: 'ordinaryScene' });
    expect(entry.occurrence).toEqual({ sourcePath: 'children[0]', expansionPath: [] });
    expect(entry.colorScope).toBe(0);
    expect(entry.transform).toEqual([1, 0, 0, 1, 0, 0]);
    expect(flatten(entry.scene.primitives)).toContainEqual(
      expect.objectContaining({ type: 'path', stroke: '#2563eb' }),
    );
  });

  it('assigns appearance before callbacks so an empty output still consumes its color scope', () => {
    const appearances: Array<number> = [];
    const empty = compositeDefinition('empty', (_artifact, context) => {
      appearances.push(context.appearance.colorScope);
      return [];
    });
    const visible = compositeDefinition('visible', (_artifact, context) => {
      appearances.push(context.appearance.colorScope);
      return { type: 'coordinate', id: 'visible-point', position: [0, 0] };
    });

    const result = compileToScene(
      scene([
        { namespace: 'test', type: 'empty' },
        { namespace: 'test', type: 'visible' },
      ]),
      {
        composites: [empty, visible],
        inspection: { roots: [selectedRoot(0), selectedRoot(1)] },
      },
    );

    expect(appearances).toEqual([0, 1]);
    expect(result.inspection?.entries.map(entry => entry.colorScope)).toEqual([1]);
  });

  it('cycles the canonical appearance across empty callbacks and returns a null plane', () => {
    const appearances: Array<Readonly<{ colorScope: number; scopeColor: string; warningColor: string }>> = [];
    const definitions = Array.from({ length: 10 }, (_, index) =>
      compositeDefinition(`emptyPalette${index}`, (_artifact, context) => {
        appearances.push(context.appearance);
        return [];
      }),
    );
    const result = compileToScene(
      scene(definitions.map(definition => ({ namespace: 'test', type: definition.type }))),
      {
        composites: definitions,
        inspection: { roots: definitions.map((_, index) => selectedRoot(index)) },
      },
    );

    expect(appearances.map(appearance => appearance.colorScope)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(appearances.map(appearance => appearance.scopeColor)).toEqual([
      '#2563eb',
      '#7c3aed',
      '#c026d3',
      '#db2777',
      '#ea580c',
      '#a16207',
      '#16a34a',
      '#0f766e',
      '#0891b2',
      '#2563eb',
    ]);
    expect(appearances.every(appearance => appearance.warningColor === '#dc2626')).toBe(true);
    expect(result.inspection).toBeNull();
  });

  it('lets Coordinate output establish an entry-local reference for a later Path', () => {
    const definition = compositeDefinition('localReference', () => [
      { type: 'coordinate', id: 'control', position: [8, 6] },
      {
        type: 'path',
        stroke: 'red',
        children: [
          { type: 'step', kind: 'move', to: { id: 'control' } },
          { type: 'step', kind: 'line', to: [20, 6] },
        ],
      },
    ]);

    const result = compileToScene(scene([{ namespace: 'test', type: 'localReference' }]), {
      composites: [definition],
      inspection: { roots: [selectedRoot(0)] },
    });

    expect(flatten(result.inspection!.entries[0].scene.primitives)).toContainEqual(
      expect.objectContaining({ type: 'path', commands: expect.arrayContaining([{ kind: 'move', to: [8, 6] }]) }),
    );
  });

  it('promotes a primary-plane reference from auxiliary output to a fatal output-origin error', () => {
    const definition = compositeDefinition('crossPlaneReference', () => ({
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: { id: 'primary' } },
        { type: 'step', kind: 'line', to: [20, 0] },
      ],
    }));

    const error = thrownBy(() =>
      compileToScene(
        scene([
          { type: 'node', id: 'primary', position: [0, 0], text: 'primary' },
          { namespace: 'test', type: 'crossPlaneReference' },
        ]),
        {
          composites: [definition],
          inspection: { roots: [selectedRoot(1)] },
        },
      ),
    );

    expect(error.message).toMatch(/inspection.*output.*UNRESOLVED_NODE_REFERENCE.*children\[0\]/i);
    expect(error.cause).toBeInstanceOf(Error);
    expect((error.cause as Error).message).toMatch(/UNRESOLVED_NODE_REFERENCE.*children\[0\]/i);
    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'output',
      owner: { kind: 'composite', namespace: 'test', type: 'crossPlaneReference' },
      occurrence: { sourcePath: 'children[1]', expansionPath: [] },
      outputIndex: 0,
    });
  });

  it('attributes a nested auxiliary provider failure to its exact output index and child path', () => {
    const failingPathKind = definePathKind({
      schema: z.object({ kind: z.literal('failing-auxiliary') }),
      compile: () => ({ primitives: [], boundsPoints: 'invalid' }) as never,
    });
    const definition = compositeDefinition('nestedProviderFailure', () => [
      { type: 'coordinate', id: 'valid', position: [0, 0] },
      {
        type: 'scope',
        children: [
          {
            type: 'path',
            kind: 'failing-auxiliary',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [1, 0] },
            ],
          },
        ],
      },
    ]);

    const error = thrownBy(() =>
      compileToScene(scene([{ namespace: 'test', type: 'nestedProviderFailure' }]), {
        composites: [definition],
        pathKinds: [failingPathKind],
        inspection: { roots: [selectedRoot(0)] },
      }),
    );

    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'output',
      owner: { kind: 'composite', namespace: 'test', type: 'nestedProviderFailure' },
      occurrence: { sourcePath: 'children[0]', expansionPath: [] },
      outputIndex: 1,
    });
    expect(error.cause).toBeInstanceOf(Error);
    expect((error.cause as Error).message).toMatch(/children\[1\]\.scope\.children\[0\]\.path/);
  });

  it('fails loudly when a later auxiliary output references an unregistered Composite', () => {
    const definition = compositeDefinition('unregisteredOutput', () => [
      { type: 'coordinate', id: 'valid', position: [0, 0] },
      { namespace: 'missing', type: 'auxiliaryComposite' },
    ]);
    const error = thrownBy(() =>
      compileToScene(scene([{ namespace: 'test', type: 'unregisteredOutput' }]), {
        composites: [definition],
        inspection: { roots: [selectedRoot(0)] },
      }),
    );

    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'output',
      owner: { kind: 'composite', namespace: 'test', type: 'unregisteredOutput' },
      occurrence: { sourcePath: 'children[0]', expansionPath: [] },
      outputIndex: 1,
    });
    expect(error.message).toMatch(/COMPOSITE_NOT_REGISTERED.*children\[1\]/i);
  });

  it('preserves the nested child path for an unregistered auxiliary Composite', () => {
    const definition = compositeDefinition('nestedUnregisteredOutput', () => [
      { type: 'coordinate', id: 'valid', position: [0, 0] },
      {
        type: 'scope',
        children: [{ namespace: 'missing', type: 'auxiliaryComposite' }],
      },
    ]);
    const error = thrownBy(() =>
      compileToScene(scene([{ namespace: 'test', type: 'nestedUnregisteredOutput' }]), {
        composites: [definition],
        inspection: { roots: [selectedRoot(0)] },
      }),
    );

    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'output',
      owner: { kind: 'composite', namespace: 'test', type: 'nestedUnregisteredOutput' },
      occurrence: { sourcePath: 'children[0]', expansionPath: [] },
      outputIndex: 1,
    });
    expect(error.message).toMatch(/COMPOSITE_NOT_REGISTERED.*children\[1\]\.scope\.children\[0\]/i);
  });

  it('keeps enabled false as a hard barrier against the current self request', () => {
    const inspect = vi.fn(
      (): ReadonlyArray<IRChild> => [
        { type: 'coordinate' as const, id: 'blocked-point', position: [0, 0] as [number, number] },
      ],
    );
    const definition = compositeDefinition('blocked', inspect);
    const root = selectedRoot(0);

    const result = compileToScene(scene([{ namespace: 'test', type: 'blocked' }]), {
      composites: [definition],
      inspection: {
        roots: [
          {
            ...root,
            tree: { policy: { inherited: { enabled: false }, self: true } },
          },
        ],
      },
    });

    expect(inspect).not.toHaveBeenCalled();
    expect(result.inspection).toBeNull();
  });

  it('fails before provider execution when locator target and authored child disagree', () => {
    const inspect = vi.fn(() => []);
    const definition = compositeDefinition('targetMismatch', inspect);
    const locator = { target: 'path' as const, path: [{ kind: 'sceneChild' as const, index: 0 }] as const };

    const error = thrownBy(() =>
      compileToScene(scene([{ namespace: 'test', type: 'targetMismatch' }]), {
        composites: [definition],
        inspection: {
          roots: [
            {
              locator,
              tree: { policy: { self: true } },
            },
          ],
        },
      }),
    );

    expect(error.message).toMatch(/target.*path.*Composite|Composite.*target.*path/i);
    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'resolve',
      site: 'authoring',
      locator: { kind: 'scene', value: locator },
    });
    expect(inspect).not.toHaveBeenCalled();
  });

  it('rejects a duplicate locator before invoking its owner Inspector', () => {
    const inspect = vi.fn((): ReadonlyArray<IRChild> => []);
    const definition = compositeDefinition('duplicateLocator', inspect);
    const root = selectedRoot(0);
    const error = thrownBy(() =>
      compileToScene(scene([{ namespace: 'test', type: 'duplicateLocator' }]), {
        composites: [definition],
        inspection: { roots: [root, root] },
      }),
    );

    expect(error.message).toMatch(/duplicate root.*children\[0\]/i);
    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'resolve',
      site: 'authoring',
      locator: { kind: 'scene', value: root.locator },
    });
    expect(inspect).not.toHaveBeenCalled();
  });

  it('attaches the bound owner and occurrence to options resolution failures', () => {
    const definition = compositeDefinition('invalidOptions', () => []);

    const error = thrownBy(() =>
      compileToScene(scene([{ namespace: 'test', type: 'invalidOptions' }]), {
        composites: [definition],
        inspection: { roots: [selectedRoot(0, { guides: 'invalid' })] },
      }),
    );

    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'resolve',
      site: 'occurrence',
      owner: { kind: 'composite', namespace: 'test', type: 'invalidOptions' },
      occurrence: { sourcePath: 'children[0]', expansionPath: [] },
    });
  });

  it('distinguishes Inspector callback failures from output failures', () => {
    const inspectFailure = compositeDefinition('inspectFailure', () => {
      throw new Error('inspect boom');
    });
    const hostileOutput = compositeDefinition('hostileOutput', () => {
      const output = new Array<IRChild>(1);
      Object.defineProperty(output, 0, {
        enumerable: true,
        get: () => {
          throw new Error('output getter boom');
        },
      });
      return output;
    });

    const inspectError = thrownBy(() =>
      compileToScene(scene([{ namespace: 'test', type: 'inspectFailure' }]), {
        composites: [inspectFailure],
        inspection: { roots: [selectedRoot(0)] },
      }),
    );
    const outputError = thrownBy(() =>
      compileToScene(scene([{ namespace: 'test', type: 'hostileOutput' }]), {
        composites: [hostileOutput],
        inspection: { roots: [selectedRoot(0)] },
      }),
    );

    expect(inspectError.origin).toEqual({
      kind: 'inspection',
      stage: 'inspect',
      owner: { kind: 'composite', namespace: 'test', type: 'inspectFailure' },
      occurrence: { sourcePath: 'children[0]', expansionPath: [] },
    });
    expect(outputError.origin).toEqual({
      kind: 'inspection',
      stage: 'output',
      owner: { kind: 'composite', namespace: 'test', type: 'hostileOutput' },
      occurrence: { sourcePath: 'children[0]', expansionPath: [] },
      outputIndex: 0,
    });
  });

  it('rejects sparse, extra-key, symbol-key, and non-JSON outputs without admitting partial entries', () => {
    const invalidOutputs: Array<ReadonlyArray<IRChild>> = [];
    invalidOutputs.push(new Array<IRChild>(1));

    const withExtra: Array<IRChild> = [{ type: 'coordinate', id: 'extra', position: [0, 0] }];
    Object.defineProperty(withExtra, 'extra', { enumerable: true, value: true });
    invalidOutputs.push(withExtra);

    const withSymbol: Array<IRChild> = [{ type: 'coordinate', id: 'symbol', position: [0, 0] }];
    Object.defineProperty(withSymbol, Symbol('hidden'), { enumerable: true, value: true });
    invalidOutputs.push(withSymbol);

    invalidOutputs.push([
      {
        type: 'node',
        position: [0, 0],
        meta: { invalid: new Date(0) },
      } as unknown as IRChild,
    ]);

    for (const output of invalidOutputs) {
      const definition = compositeDefinition('invalidOutput', () => output);
      const error = thrownBy(() =>
        compileToScene(scene([{ namespace: 'test', type: 'invalidOutput' }]), {
          composites: [definition],
          inspection: { roots: [selectedRoot(0)] },
        }),
      );

      expect(error.origin).toMatchObject({ kind: 'inspection', stage: 'output', outputIndex: 0 });
    }
  });

  it('wraps hostile output container reflection with an exact output origin', () => {
    const output = new Proxy<Array<IRChild>>([], {
      ownKeys: () => {
        throw new Error('ownKeys trap executed');
      },
    });
    const definition = compositeDefinition('hostileProxy', () => output);

    const error = thrownBy(() =>
      compileToScene(scene([{ namespace: 'test', type: 'hostileProxy' }]), {
        composites: [definition],
        inspection: { roots: [selectedRoot(0)] },
      }),
    );

    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'output',
      owner: { kind: 'composite', namespace: 'test', type: 'hostileProxy' },
      occurrence: { sourcePath: 'children[0]', expansionPath: [] },
      outputIndex: 0,
    });
  });

  it('attaches output origin to non-fatal warnings produced by auxiliary children', () => {
    const definition = compositeDefinition('warningOutput', () => ({
      type: 'path',
      children: [
        { type: 'step', kind: 'line', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
      ],
    }));
    const warnings: Array<CompileWarning> = [];

    compileToScene(scene([{ namespace: 'test', type: 'warningOutput' }]), {
      composites: [definition],
      inspection: { roots: [selectedRoot(0)] },
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toContainEqual(
      expect.objectContaining({
        code: 'PATH_TOO_SHORT',
        origin: {
          kind: 'inspection',
          stage: 'output',
          owner: { kind: 'composite', namespace: 'test', type: 'warningOutput' },
          occurrence: { sourcePath: 'children[0]', expansionPath: [] },
          outputIndex: 0,
        },
      }),
    );
  });

  it('inherits the occurrence Theme and complete Scope style stack in auxiliary compile', () => {
    const themedOutput = defineComposite({
      namespace: 'test',
      type: 'themedOutput',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('themedOutput'),
      }),
      expand: (_node, context) => ({
        type: 'node',
        position: [0, 0],
        fill: context.theme.mode === ThemeMode.Dark ? '#111111' : '#eeeeee',
      }),
    });
    const inspected = compositeDefinition('themedOwner', () => [
      { namespace: 'test', type: 'themedOutput' },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      },
    ]);

    const result = compileToScene(
      scene([
        {
          type: 'scope',
          theme: { mode: ThemeMode.Dark },
          pathDefault: { stroke: '#f97316' },
          children: [{ namespace: 'test', type: 'themedOwner' }],
        },
      ]),
      {
        composites: [inspected, themedOutput],
        inspection: {
          roots: [
            {
              locator: {
                target: 'composite',
                path: [
                  { kind: 'sceneChild', index: 0 },
                  { kind: 'scopeChild', index: 0 },
                ],
              },
              tree: { policy: { self: true } },
            },
          ],
        },
      },
    );
    const primitives = flatten(result.inspection!.entries[0].scene.primitives);

    expect(primitives).toContainEqual(expect.objectContaining({ type: 'rect', fill: '#111111' }));
    expect(primitives).toContainEqual(expect.objectContaining({ type: 'path', stroke: '#f97316' }));
  });

  it('reuses a custom PathKind definition while compiling auxiliary output', () => {
    const auxiliaryPathKind = definePathKind({
      schema: z.object({ kind: z.literal('auxiliary-provider') }),
      compile: () => ({
        primitives: [{ type: 'rect' as const, x: 4, y: 6, width: 8, height: 10, fill: '#22c55e' }],
        boundsPoints: [[0, 1] as [number, number], [8, 11] as [number, number]],
      }),
    });
    const definition = compositeDefinition('providerReuse', () => ({
      type: 'path',
      kind: 'auxiliary-provider',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [1, 0] },
      ],
    }));
    const result = compileToScene(scene([{ namespace: 'test', type: 'providerReuse' }]), {
      composites: [definition],
      pathKinds: [auxiliaryPathKind],
      inspection: { roots: [selectedRoot(0)] },
    });

    expect(flatten(result.inspection!.entries[0].scene.primitives)).toContainEqual({
      type: 'rect',
      x: 4,
      y: 6,
      width: 8,
      height: 10,
      fill: '#22c55e',
    });
  });

  it('isolates duplicate ids, resources, and auxiliary artifacts between entries and the primary result', () => {
    const auxiliaryArtifact = defineComposite({
      namespace: 'test',
      type: 'auxiliaryArtifact',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('auxiliaryArtifact'),
      }),
      artifactSchema: z.strictObject({ auxiliary: z.literal(true) }),
      compile: () => ({ children: [], artifact: { auxiliary: true } }),
    });
    const inspected = (type: string, position: [number, number], color: string) =>
      compositeDefinition(type, () => [
        { type: 'coordinate', id: 'shared', position },
        {
          type: 'node',
          position,
          fill: {
            kind: 'linearGradient',
            stops: [
              { offset: 0, color },
              { offset: 1, color: '#ffffff' },
            ],
          },
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'shared' } },
            { type: 'step', kind: 'line', to: [position[0] + 4, position[1]] },
          ],
        },
        { namespace: 'test', type: 'auxiliaryArtifact' },
      ]);
    const first = inspected('isolatedFirst', [2, 3], '#ef4444');
    const second = inspected('isolatedSecond', [12, 13], '#3b82f6');

    const result = compileToScene(
      scene([
        { namespace: 'test', type: 'isolatedFirst' },
        { namespace: 'test', type: 'isolatedSecond' },
      ]),
      {
        composites: [first, second, auxiliaryArtifact],
        inspection: { roots: [selectedRoot(0), selectedRoot(1)] },
      },
    );

    expect(result.artifacts.filter(artifact => artifact.kind === 'composite').map(artifact => artifact.type)).toEqual([
      'isolatedFirst',
      'isolatedSecond',
    ]);
    expect(result.inspection?.entries).toHaveLength(2);
    const [firstEntry, secondEntry] = result.inspection!.entries;
    expect(firstEntry.scene.resources).toHaveLength(1);
    expect(secondEntry.scene.resources).toHaveLength(1);
    expect(firstEntry.scene.resources).not.toEqual(secondEntry.scene.resources);

    const firstPath = flatten(firstEntry.scene.primitives).find(primitive => primitive.type === 'path');
    const secondPath = flatten(secondEntry.scene.primitives).find(primitive => primitive.type === 'path');
    expect(firstPath?.type === 'path' ? firstPath.commands[0] : undefined).toEqual({ kind: 'move', to: [2, 3] });
    expect(secondPath?.type === 'path' ? secondPath.commands[0] : undefined).toEqual({ kind: 'move', to: [12, 13] });
  });

  it('recursively seals public identity, metadata, and animation from the auxiliary Scene', () => {
    const definition = compositeDefinition('sealedOutput', () => ({
      type: 'scope',
      id: 'outer',
      meta: { role: 'outer' },
      animations: [fade],
      children: [
        {
          type: 'node',
          id: 'inner',
          position: [0, 0],
          text: 'sealed',
          meta: { role: 'inner' },
          animations: [fade],
        },
      ],
    }));

    const result = compileToScene(scene([{ namespace: 'test', type: 'sealedOutput' }]), {
      composites: [definition],
      inspection: { roots: [selectedRoot(0)] },
    });
    const entryScene = result.inspection!.entries[0].scene;

    expect(Reflect.has(entryScene, 'animations')).toBe(false);
    for (const primitive of flatten(entryScene.primitives)) {
      expect(Reflect.has(primitive, 'id')).toBe(false);
      expect(Reflect.has(primitive, 'meta')).toBe(false);
      expect(Reflect.has(primitive, 'animations')).toBe(false);
    }
  });

  it('detaches and deeply freezes deterministic inspection results', () => {
    const output = { type: 'coordinate' as const, id: 'detached', position: [3, 4] as [number, number] };
    const definition = compositeDefinition('deterministicOutput', () => output);
    const ir = scene([{ namespace: 'test', type: 'deterministicOutput' }]);
    const options = {
      composites: [definition],
      inspection: { roots: [selectedRoot(0)] },
    } as const;

    const first = compileToScene(ir, options);
    const repeated = compileToScene(ir, options);
    expect(repeated.inspection).toEqual(first.inspection);
    expect(Object.isFrozen(first.inspection)).toBe(true);
    expect(Object.isFrozen(first.inspection!.entries)).toBe(true);
    expect(Object.isFrozen(first.inspection!.entries[0].scene)).toBe(true);
    expect(Object.isFrozen(first.inspection!.entries[0].scene.primitives)).toBe(true);

    const serialized = JSON.stringify(first.inspection);
    output.position[0] = 99;
    expect(JSON.stringify(first.inspection)).toBe(serialized);
  });
});
