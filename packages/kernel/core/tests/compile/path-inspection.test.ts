import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { InspectionDiagnosticOrigin, IRChild, IRScene, PathKindCompileResult, ScenePrimitive } from '../../src';

import { compileToScene, defineInspector, definePathKind } from '../../src';

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

const flatten = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...flatten(primitive.children)] : [primitive],
  );

const selectedPath = (index = 0, self: boolean | Readonly<Record<string, unknown>> = true) => ({
  locator: { target: 'path' as const, path: [{ kind: 'sceneChild' as const, index }] as const },
  tree: { policy: { self } },
});

const thrownBy = (callback: () => unknown): Error & Readonly<{ origin?: InspectionDiagnosticOrigin }> => {
  try {
    callback();
  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }
  throw new Error('Expected callback to throw.');
};

const cubicPath: IRChild = {
  type: 'path',
  stroke: 'black',
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'cubic', control1: [20, 30], control2: [60, 30], to: [80, 0] },
  ],
};

describe('Path Inspector compile channel', () => {
  it('uses the built-in stroke settled commands to draw control handles', () => {
    const withoutInspection = compileToScene(scene([cubicPath]));
    const result = compileToScene(scene([cubicPath]), {
      inspection: { roots: [selectedPath(0, { controlPoints: true, labels: false })] },
    });

    expect(result.scene).toEqual(withoutInspection.scene);
    expect(result.artifacts).toEqual(withoutInspection.artifacts);
    expect(result.inspection?.entries).toHaveLength(1);
    expect(result.inspection?.entries[0]).toMatchObject({
      owner: { kind: 'pathKind', name: 'stroke' },
      occurrence: { sourcePath: 'children[0].path', expansionPath: [] },
      colorScope: 0,
    });
    const primitives = flatten(result.inspection!.entries[0].scene.primitives);
    expect(primitives.filter(primitive => primitive.type === 'path')).toHaveLength(1);
    expect(primitives.filter(primitive => primitive.type === 'ellipse')).toHaveLength(2);
    expect(primitives).toContainEqual(expect.objectContaining({ type: 'path', stroke: '#2563eb' }));
  });

  it('uses settled quadratic commands in local coordinates and publishes the final Scope transform once', () => {
    const result = compileToScene(
      scene([
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 12, y: 8 }],
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'curve', control: [5, -6], to: [10, 0] },
              ],
            },
          ],
        },
      ]),
      {
        inspection: {
          roots: [
            {
              locator: {
                target: 'path',
                path: [
                  { kind: 'sceneChild', index: 0 },
                  { kind: 'scopeChild', index: 0 },
                ],
              },
              tree: { policy: { self: { controlPoints: true, labels: true } } },
            },
          ],
        },
      },
    );
    const entry = result.inspection!.entries[0];
    const primitives = flatten(entry.scene.primitives);
    const handles = primitives.find(primitive => primitive.type === 'path');

    expect(entry.occurrence).toEqual({ sourcePath: 'children[0].scope.children[0].path', expansionPath: [] });
    expect(entry.transform).toEqual([1, 0, 0, 1, 12, 8]);
    expect(handles?.type === 'path' ? handles.commands : undefined).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [5, -6] },
      { kind: 'line', to: [10, 0] },
    ]);
    expect(primitives).toContainEqual(expect.objectContaining({ type: 'ellipse', cx: 5, cy: -6 }));
    expect(
      primitives
        .filter(primitive => primitive.type === 'text')
        .flatMap(primitive => primitive.lines.map(line => line.text)),
    ).toEqual(['Q1']);
  });

  it('applies the Path own rotate and scale to its control-point Scene exactly once', () => {
    const result = compileToScene(
      scene([
        {
          type: 'path',
          rotate: 90,
          scale: { x: 2, y: 3 },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'curve', control: [5, -6], to: [10, 0] },
          ],
        },
      ]),
      {
        inspection: { roots: [selectedPath(0, { controlPoints: true, labels: false })] },
        padding: 0,
      },
    );
    const entry = result.inspection!.entries[0];

    expect(entry.transform).toEqual([1, 0, 0, 1, 0, 0]);
    expect(entry.scene.primitives[0]).toMatchObject({
      type: 'group',
      transforms: [
        { kind: 'rotate', degrees: 90, cx: 5, cy: -3 },
        { kind: 'translate', x: 5, y: -3 },
        { kind: 'scale', x: 2, y: 3 },
        { kind: 'translate', x: -5, y: 3 },
      ],
    });
    expect(flatten(entry.scene.primitives)).toContainEqual(expect.objectContaining({ type: 'ellipse', cx: 5, cy: -6 }));
  });

  it('lets a custom Path kind own its subject and sparse options', () => {
    const observed = vi.fn();
    const inspector = defineInspector({
      kind: 'path',
      optionsInputSchema: z.strictObject({ markers: z.boolean().optional() }),
      optionsSchema: z
        .strictObject({ markers: z.boolean().optional() })
        .transform(value => ({ markers: value.markers ?? true })),
      inspect: (subject: { point: [number, number] }, context): IRChild => {
        observed(subject, context);
        return {
          type: 'path',
          stroke: context.appearance.scopeColor,
          children: [
            { type: 'step', kind: 'move', to: subject.point },
            { type: 'step', kind: 'line', to: [subject.point[0] + 5, subject.point[1]] },
          ],
        };
      },
    });
    const definition = definePathKind({
      schema: z.object({ kind: z.literal('custom-inspected') }),
      inspectionSubjectSchema: z.strictObject({ point: z.tuple([z.number(), z.number()]) }),
      inspector,
      compile: (): PathKindCompileResult<{ point: [number, number] }> => ({
        primitives: [{ type: 'rect', x: 4, y: 6, width: 1, height: 1, fill: 'black' }],
        boundsPoints: [[4, 6]],
        inspectionSubject: { point: [4, 6] },
      }),
    });

    const result = compileToScene(
      scene([{ type: 'path', kind: 'custom-inspected', children: [] }] as IRScene['children']),
      {
        pathKinds: [definition],
        inspection: { roots: [selectedPath(0, { markers: false })] },
      },
    );

    expect(observed).toHaveBeenCalledWith({ point: [4, 6] }, expect.objectContaining({ options: { markers: false } }));
    expect(result.inspection?.entries[0].owner).toEqual({ kind: 'pathKind', name: 'custom-inspected' });
  });

  it('skips the callback and entry when a selected Path kind returns null', () => {
    const inspect = vi.fn((): ReadonlyArray<IRChild> => []);
    const inspector = defineInspector({
      kind: 'path',
      optionsInputSchema: z.strictObject({}),
      optionsSchema: z.strictObject({}),
      inspect,
    });
    const definition = definePathKind({
      schema: z.object({ kind: z.literal('empty-inspected') }),
      inspectionSubjectSchema: z.strictObject({ value: z.number() }),
      inspector,
      compile: (): PathKindCompileResult<{ value: number }> | null => null,
    });

    const result = compileToScene(
      scene([{ type: 'path', kind: 'empty-inspected', children: [] }] as IRScene['children']),
      { pathKinds: [definition], inspection: { roots: [selectedPath()] } },
    );

    expect(inspect).not.toHaveBeenCalled();
    expect(result.inspection).toBeNull();
  });

  it('does not read or validate an inspection-only subject until the Path is selected', () => {
    const inspect = vi.fn((): ReadonlyArray<IRChild> => []);
    const inspector = defineInspector({
      kind: 'path',
      optionsInputSchema: z.strictObject({}),
      optionsSchema: z.strictObject({}),
      inspect,
    });
    const definition = definePathKind({
      schema: z.object({ kind: z.literal('hostile-subject') }),
      inspectionSubjectSchema: z.strictObject({ value: z.number() }),
      inspector,
      compile: () => {
        const result = {
          primitives: [{ type: 'rect' as const, x: 0, y: 0, width: 1, height: 1 }],
          boundsPoints: [[0, 0] as [number, number]],
        };
        Object.defineProperty(result, 'inspectionSubject', {
          get: () => {
            throw new Error('subject getter executed');
          },
        });
        return result as PathKindCompileResult<{ value: number }>;
      },
    });
    const ir = scene([{ type: 'path', kind: 'hostile-subject', children: [] }] as IRScene['children']);

    expect(() => compileToScene(ir, { pathKinds: [definition] })).not.toThrow();
    const error = thrownBy(() =>
      compileToScene(ir, {
        pathKinds: [definition],
        inspection: { roots: [selectedPath()] },
      }),
    );
    expect(error.message).toMatch(/inspection subject|subject getter/i);
    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'resolve',
      site: 'occurrence',
      owner: { kind: 'pathKind', name: 'hostile-subject' },
      occurrence: { sourcePath: 'children[0].path', expansionPath: [] },
    });
    expect(inspect).not.toHaveBeenCalled();
  });

  it('forces Inspector off while compiling auxiliary output', () => {
    const inspect = vi.fn();
    const inspector = defineInspector({
      kind: 'path',
      optionsInputSchema: z.strictObject({}),
      optionsSchema: z.strictObject({}),
      inspect: (subject: { point: [number, number] }, context): IRChild => {
        inspect(subject, context);
        return {
          type: 'path',
          kind: 'recursive-inspected',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [1, 0] },
          ],
        };
      },
    });
    const definition = definePathKind({
      schema: z.object({ kind: z.literal('recursive-inspected') }),
      inspectionSubjectSchema: z.strictObject({ point: z.tuple([z.number(), z.number()]) }),
      inspector,
      compile: (): PathKindCompileResult<{ point: [number, number] }> => ({
        primitives: [{ type: 'rect', x: 0, y: 0, width: 2, height: 2 }],
        boundsPoints: [[0, 0]],
        inspectionSubject: { point: [0, 0] },
      }),
    });

    const result = compileToScene(
      scene([{ type: 'path', kind: 'recursive-inspected', children: [] }] as IRScene['children']),
      { pathKinds: [definition], inspection: { roots: [selectedPath()] } },
    );

    expect(inspect).toHaveBeenCalledTimes(1);
    expect(result.inspection?.entries).toHaveLength(1);
  });

  it('supports labels without control handles when the built-in options disable control points', () => {
    const result = compileToScene(scene([cubicPath]), {
      inspection: { roots: [selectedPath(0, { controlPoints: false, labels: true })] },
    });
    const primitives = flatten(result.inspection!.entries[0].scene.primitives);

    expect(primitives.some(primitive => primitive.type === 'path')).toBe(false);
    const labels = primitives
      .filter(primitive => primitive.type === 'text')
      .flatMap(primitive => primitive.lines.map(line => line.text));
    expect(labels).toEqual(['C1.1', 'C1.2']);
  });

  it('rejects children on a Path target before invoking its Inspector', () => {
    const root = selectedPath();
    const error = thrownBy(() =>
      compileToScene(scene([cubicPath]), {
        inspection: {
          roots: [
            {
              ...root,
              tree: { policy: { self: true }, children: [] },
            },
          ],
        },
      }),
    );

    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'resolve',
      site: 'authoring',
      locator: { kind: 'scene', value: root.locator },
    });
  });

  it('attaches the Path owner and occurrence to options schema rejection', () => {
    const error = thrownBy(() =>
      compileToScene(scene([cubicPath]), {
        inspection: { roots: [selectedPath(0, { controlPoints: 'invalid' })] },
      }),
    );

    expect(error.origin).toEqual({
      kind: 'inspection',
      stage: 'resolve',
      site: 'occurrence',
      owner: { kind: 'pathKind', name: 'stroke' },
      occurrence: { sourcePath: 'children[0].path', expansionPath: [] },
    });
  });

  it('applies enabled false as a hard barrier to an explicit Path self request', () => {
    const root = selectedPath();
    const result = compileToScene(scene([cubicPath]), {
      inspection: {
        roots: [
          {
            ...root,
            tree: { policy: { inherited: { enabled: false }, self: true } },
          },
        ],
      },
    });

    expect(result.inspection).toBeNull();
  });

  it('does not let inherited layout policy select or suppress a Path Inspector', () => {
    const inheritedOnly = compileToScene(scene([cubicPath]), {
      inspection: { root: { layout: true } },
    });
    const root = selectedPath();
    const explicitUnderLayoutFalse = compileToScene(scene([cubicPath]), {
      inspection: {
        roots: [
          {
            ...root,
            tree: { policy: { inherited: { layout: false }, self: true } },
          },
        ],
      },
    });

    expect(inheritedOnly.inspection).toBeNull();
    expect(explicitUnderLayoutFalse.inspection?.entries).toHaveLength(1);
    expect(explicitUnderLayoutFalse.inspection?.entries[0].owner).toEqual({ kind: 'pathKind', name: 'stroke' });
  });
});
